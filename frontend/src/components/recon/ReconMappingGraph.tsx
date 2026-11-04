import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import {
  Download,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Minimize2,
  RotateCcw,
  Crosshair,
  Copy,
  Check,
  Terminal,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  Layers,
  Radar,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Loader } from '@/components/common/Loader';
import { ReconDetail, DomainStatus, SubdomainEntry, ReconRelationship } from '@/types/api';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';

export interface ReconMappingGraphProps {
  recon: ReconDetail;
  onHunt?: (hostname: string) => void;
  onStatusChange?: (hostname: string, newStatus: DomainStatus) => Promise<void>;
  activeHunts?: Record<string, number>;
  isHunting?: boolean;
  huntingHost?: string;
  huntElapsed?: number;
}

interface DomainNodeData {
  hostname: string;
  isRoot: boolean;
  status: DomainStatus;
  depth: number;
  parent: string | null;
  children: string[];
}

export interface TreeExportData {
  hostname: string;
  isRoot: boolean;
  depth: number;
  status: DomainStatus;
  childrenCount: number;
  leftChildren: TreeExportData[];
  rightChildren: TreeExportData[];
}

// Layout constants
const HORIZONTAL_GAP = 320;
const SLOT_HEIGHT = 80;
const DEFAULT_CHUNK_SIZE = 30;

function normalizeHost(val: string | undefined | null): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/^\*\./, '')
    .replace(/\.$/, '');
}

export const ReconMappingGraph: React.FC<ReconMappingGraphProps> = ({
  recon,
  onHunt,
  onStatusChange,
  activeHunts = {},
  isHunting = false,
  huntingHost = '',
  huntElapsed = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const currentHunts: Record<string, number> = useMemo(() => {
    if (activeHunts && Object.keys(activeHunts).length > 0) return activeHunts;
    if (isHunting && huntingHost) return { [huntingHost]: huntElapsed || 0 };
    return {};
  }, [activeHunts, isHunting, huntingHost, huntElapsed]);

  const huntEntries = Object.entries(currentHunts);
  const isAnyHunting = huntEntries.length > 0;
  const [firstHuntHost = '', firstHuntElapsed = 0] = huntEntries[0] || [];

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [depthInput, setDepthInput] = useState<string>('');
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Selected Entity state (for bottom detail bar)
  const [selectedEntity, setSelectedEntity] = useState<{
    hostname: string;
    isRoot: boolean;
    parent: string | null;
    childrenCount: number;
    status: DomainStatus;
    depth: number;
  } | null>(null);

  // Context Menu Popover state (attached to clicked node in canvas)
  const [activePopover, setActivePopover] = useState<{
    hostname: string;
    isRoot: boolean;
    status: DomainStatus;
    depth: number;
    parent: string | null;
    childrenCount: number;
    hasChildren: boolean;
    isExpanded: boolean;
    pos: { x: number; y: number };
    nodeSize: { width: number; height: number };
  } | null>(null);

  // Expand / Collapse state per domain
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(() => {
    const set = new Set<string>();
    (recon.domains || []).forEach((d) => set.add(normalizeHost(d)));
    if (recon.name) set.add(normalizeHost(recon.name));

    // If dataset is small (<= 30 subdomains), expand all intermediate branches initially
    const subCount = Array.isArray(recon.subdomains) ? recon.subdomains.length : 0;
    if (subCount <= DEFAULT_CHUNK_SIZE && Array.isArray(recon.subdomains)) {
      recon.subdomains.forEach((s) => {
        const h = normalizeHost(typeof s === 'string' ? s : s.hostname);
        if (h) set.add(h);
      });
    }
    return set;
  });

  // Loaded child counts per node (for chunked pagination: 30 first, then click load more)
  const [loadedCountMap, setLoadedCountMap] = useState<Record<string, number>>({});

  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // View states: collapsible sidebar and fullscreen canvas
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Process Recon Data into Normalized Domains & Proper Parent-Child Hierarchy
  const {
    roots,
    domainsMap,
    maxDepth,
    statusCounts,
    totalAssets,
    subdomainsCount,
  } = useMemo(() => {
    // Collect root domains
    const rootList = Array.from(
      new Set(
        (Array.isArray(recon.domains) ? recon.domains : [])
          .map(normalizeHost)
          .filter(Boolean)
      )
    );

    // Fallback if domains is empty but name or subdomains exist
    if (rootList.length === 0 && recon.name) {
      const candidate = normalizeHost(recon.name);
      if (candidate.includes('.')) {
        rootList.push(candidate);
      }
    }

    const map = new Map<string, DomainNodeData>();

    const getStatusForHost = (host: string, entry?: SubdomainEntry): DomainStatus => {
      const explicit = recon.domainStatuses && (recon.domainStatuses[host] || recon.domainStatuses[host.toLowerCase()]);
      if (explicit) return explicit;
      const raw = entry?.status || 'new';
      return raw === 'success' ? 'success' : raw === 'pending' ? 'pending' : 'new';
    };

    // Initialize root nodes
    for (const r of rootList) {
      map.set(r, {
        hostname: r,
        isRoot: true,
        status: getStatusForHost(r),
        depth: 0,
        parent: null,
        children: [],
      });
    }

    // Register all subdomains
    const subEntries = Array.isArray(recon.subdomains) ? recon.subdomains : [];
    for (const sub of subEntries) {
      const host = normalizeHost(typeof sub === 'string' ? sub : sub.hostname);
      if (!host) continue;

      if (!map.has(host)) {
        map.set(host, {
          hostname: host,
          isRoot: rootList.includes(host),
          status: getStatusForHost(host, typeof sub === 'object' ? sub : undefined),
          depth: 0,
          parent: (typeof sub === 'object' && sub.parent ? normalizeHost(sub.parent) : null),
          children: [],
        });
      }
    }

    // Apply explicit relationships
    const rels: ReconRelationship[] = Array.isArray(recon.relationships) ? recon.relationships : [];
    for (const rel of rels) {
      const p = normalizeHost(rel.parent);
      const c = normalizeHost(rel.child);
      if (p && c && p !== c && map.has(p) && map.has(c)) {
        map.get(c)!.parent = p;
      }
    }

    // For any subdomain without a valid parent, deduce best parent
    for (const [host, item] of map.entries()) {
      if (item.isRoot) continue;
      if (item.parent && map.has(item.parent)) continue;

      let bestCandidate: string | null = null;
      for (const candidate of map.keys()) {
        if (candidate === host) continue;
        if (host.endsWith('.' + candidate)) {
          if (!bestCandidate || candidate.length > bestCandidate.length) {
            bestCandidate = candidate;
          }
        }
      }

      if (bestCandidate) {
        item.parent = bestCandidate;
      } else {
        // Fallback: connect to best matching root domain
        let bestRoot: string | null = null;
        for (const r of rootList) {
          if (host.endsWith('.' + r) && (!bestRoot || r.length > bestRoot.length)) {
            bestRoot = r;
          }
        }
        if (bestRoot) {
          item.parent = bestRoot;
        } else {
          item.parent = rootList[0] || null;
        }
      }
    }

    // Populate children arrays
    for (const item of map.values()) {
      item.children = [];
    }
    for (const [host, item] of map.entries()) {
      if (item.parent && map.has(item.parent)) {
        const pItem = map.get(item.parent)!;
        if (!pItem.children.includes(host)) {
          pItem.children.push(host);
        }
      }
    }

    // Compute depth recursively
    let deepest = 0;
    const calculateDepth = (host: string, currentDepth: number, visited = new Set<string>()) => {
      if (visited.has(host)) return;
      visited.add(host);
      const node = map.get(host);
      if (!node) return;
      node.depth = currentDepth;
      if (currentDepth > deepest) deepest = currentDepth;

      for (const child of node.children) {
        calculateDepth(child, currentDepth + 1, visited);
      }
    };

    for (const r of rootList) {
      calculateDepth(r, 0);
    }

    // Tally statuses
    const tally: Record<string, number> = { new: 0, pending: 0, success: 0 };
    for (const item of map.values()) {
      tally[item.status] = (tally[item.status] || 0) + 1;
    }

    return {
      roots: rootList,
      domainsMap: map,
      maxDepth: deepest,
      statusCounts: tally,
      totalAssets: map.size,
      subdomainsCount: Math.max(0, map.size - rootList.length),
    };
  }, [recon]);

  // 2. Deterministic Node Coordinates Layout Calculation with Chunked Loading & Expand/Collapse
  const { cytoscapeElements, treeExportHierarchy, rawElementsMap } = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const treeExportList: TreeExportData[] = [];
    let currentGlobalY = 0;

    // Helper: sort children deterministically
    const sortChildren = (hosts: string[]): string[] => {
      return [...hosts].sort((a, b) => {
        const aItem = domainsMap.get(a);
        const bItem = domainsMap.get(b);
        const aCount = aItem ? aItem.children.length : 0;
        const bCount = bItem ? bItem.children.length : 0;
        if (bCount !== aCount) return bCount - aCount;
        return a.localeCompare(b);
      });
    };

    // Build complete export hierarchy (untruncated for JSON export)
    const buildExport = (host: string, depth: number): TreeExportData => {
      const item = domainsMap.get(host);
      const isRoot = item?.isRoot ?? false;
      const status = item?.status ?? 'new';
      const children = sortChildren(item?.children ?? []);

      const left: TreeExportData[] = [];
      const right: TreeExportData[] = [];

      for (const ch of children) {
        const chItem = domainsMap.get(ch);
        const chChildren = chItem?.children ?? [];
        const chExport = buildExport(ch, depth + 1);

        if (isRoot) {
          if (chChildren.length === 0) {
            left.push(chExport);
          } else {
            right.push(chExport);
          }
        } else {
          right.push(chExport);
        }
      }

      return {
        hostname: host,
        isRoot,
        depth,
        status,
        childrenCount: children.length,
        leftChildren: left,
        rightChildren: right,
      };
    };

    for (const r of roots) {
      treeExportList.push(buildExport(r, 0));
    }

    // Position visible Cytoscape elements with chunked loading
    for (const r of roots) {
      const rootY = currentGlobalY;
      positions.set(r, { x: 0, y: rootY });

      const rootItem = domainsMap.get(r);
      const isRootExpanded = expandedHosts.has(r);
      const allRootChildren = sortChildren(rootItem?.children ?? []);
      const rootLimit = loadedCountMap[r] || DEFAULT_CHUNK_SIZE;
      const visibleRootChildren = isRootExpanded ? allRootChildren.slice(0, rootLimit) : [];
      const remainingRootCount = isRootExpanded ? Math.max(0, allRootChildren.length - rootLimit) : 0;

      // Partition visible children into left (leaves) and right (branches)
      const leftLeaves: string[] = [];
      const rightBranches: string[] = [];

      for (const ch of visibleRootChildren) {
        const chItem = domainsMap.get(ch);
        if ((chItem?.children.length ?? 0) === 0) {
          leftLeaves.push(ch);
        } else {
          rightBranches.push(ch);
        }
      }

      const loadMoreOnLeft = leftLeaves.length >= rightBranches.length;
      const loadMoreId = `load-more:${r}`;

      // 1. Layout left leaf nodes: x < 0
      const leftTotalSlots = leftLeaves.length + (remainingRootCount > 0 && loadMoreOnLeft ? 1 : 0);
      const leftTotalHeight = Math.max(1, leftTotalSlots) * SLOT_HEIGHT;
      let leftStartY = rootY - (leftTotalHeight / 2) + (SLOT_HEIGHT / 2);

      leftLeaves.forEach((leaf) => {
        positions.set(leaf, { x: -HORIZONTAL_GAP, y: leftStartY });
        leftStartY += SLOT_HEIGHT;
      });

      if (remainingRootCount > 0 && loadMoreOnLeft) {
        positions.set(loadMoreId, { x: -HORIZONTAL_GAP, y: leftStartY });
        leftStartY += SLOT_HEIGHT;
      }

      // 2. Layout right branches and their descendants: x > 0
      const layoutRightBranch = (host: string, branchDepth: number): { minY: number; maxY: number; centerY: number } => {
        const x = branchDepth * HORIZONTAL_GAP;
        const bItem = domainsMap.get(host);
        const isBranchExpanded = expandedHosts.has(host);
        const allBChildren = sortChildren(bItem?.children ?? []);
        const bLimit = loadedCountMap[host] || DEFAULT_CHUNK_SIZE;
        const visibleBChildren = isBranchExpanded ? allBChildren.slice(0, bLimit) : [];
        const remainingBCount = isBranchExpanded ? Math.max(0, allBChildren.length - bLimit) : 0;

        if (visibleBChildren.length === 0) {
          const y = currentGlobalY;
          currentGlobalY += SLOT_HEIGHT;
          positions.set(host, { x, y });
          return { minY: y, maxY: y, centerY: y };
        }

        const childCenters: number[] = [];
        let minChildY = Infinity;
        let maxChildY = -Infinity;

        for (const sub of visibleBChildren) {
          const res = layoutRightBranch(sub, branchDepth + 1);
          childCenters.push(res.centerY);
          if (res.minY < minChildY) minChildY = res.minY;
          if (res.maxY > maxChildY) maxChildY = res.maxY;
        }

        if (remainingBCount > 0) {
          const bLoadMoreId = `load-more:${host}`;
          const lmY = currentGlobalY;
          currentGlobalY += SLOT_HEIGHT;
          positions.set(bLoadMoreId, { x: (branchDepth + 1) * HORIZONTAL_GAP, y: lmY });
          childCenters.push(lmY);
          if (lmY > maxChildY) maxChildY = lmY;
        }

        const centerY = ((childCenters[0] ?? 0) + (childCenters[childCenters.length - 1] ?? 0)) / 2;
        positions.set(host, { x, y: centerY });
        return { minY: minChildY, maxY: maxChildY, centerY };
      };

      if (rightBranches.length > 0) {
        for (const branch of rightBranches) {
          layoutRightBranch(branch, 1);
        }
      }

      if (remainingRootCount > 0 && !loadMoreOnLeft) {
        const lmY = currentGlobalY;
        currentGlobalY += SLOT_HEIGHT;
        positions.set(loadMoreId, { x: HORIZONTAL_GAP, y: lmY });
      }

      currentGlobalY = Math.max(currentGlobalY, rootY + (leftTotalSlots * SLOT_HEIGHT) / 2) + 80;
    }

    // Build Cytoscape element objects (nodes & edges)
    const elements: cytoscape.ElementDefinition[] = [];

    for (const [host, pos] of positions.entries()) {
      if (host.startsWith('load-more:')) {
        const parentHost = host.replace('load-more:', '');
        const pItem = domainsMap.get(parentHost);
        const total = pItem ? pItem.children.length : 0;
        const limit = loadedCountMap[parentHost] || DEFAULT_CHUNK_SIZE;
        const remaining = Math.max(0, total - limit);
        const batch = Math.min(DEFAULT_CHUNK_SIZE, remaining);

        elements.push({
          group: 'nodes',
          data: {
            id: host,
            hostname: host,
            isLoadMore: true,
            parentHost,
            remaining,
            batch,
            label: `+ LOAD ${batch} MORE\n(${remaining.toLocaleString()} REMAINING)`,
          } as cytoscape.NodeDataDefinition,
          position: pos,
          grabbable: false,
        });

        elements.push({
          group: 'edges',
          data: {
            id: `edge:${parentHost}->${host}`,
            source: `host:${parentHost}`,
            target: host,
            isLoadMoreEdge: true,
          } as cytoscape.EdgeDataDefinition,
        });
        continue;
      }

      const item = domainsMap.get(host);
      if (!item) continue;

      const childCount = item.children.length;
      const isExp = expandedHosts.has(host);

      let label = host;
      if (item.isRoot) {
        const prefix = childCount > 0 ? (isExp ? '- ' : '+ ') : '';
        label = `${prefix}${host}\n${childCount} direct subdomains`;
      } else if (childCount > 0) {
        const prefix = isExp ? '- ' : '+ ';
        label = `${prefix}${host}\n${childCount} direct subdomains`;
      } else {
        label = `• ${host}`;
      }

      elements.push({
        group: 'nodes',
        data: {
          id: `host:${host}`,
          hostname: host,
          isRoot: item.isRoot,
          type: item.isRoot ? 'root' : 'subdomain',
          depth: item.depth,
          status: item.status,
          childrenCount: childCount,
          parent: item.parent,
          isExpanded: isExp,
          hasChildren: childCount > 0,
          label,
        } as cytoscape.NodeDataDefinition,
        position: pos,
        grabbable: true,
      });

      if (item.parent && positions.has(item.parent)) {
        elements.push({
          group: 'edges',
          data: {
            id: `edge:${item.parent}->${host}`,
            source: `host:${item.parent}`,
            target: `host:${host}`,
          } as cytoscape.EdgeDataDefinition,
        });
      }
    }

    return {
      cytoscapeElements: elements,
      treeExportHierarchy: treeExportList,
      rawElementsMap: {
        nodes: elements.filter((e) => e.group === 'nodes'),
        edges: elements.filter((e) => e.group === 'edges'),
      },
    };
  }, [roots, domainsMap, expandedHosts, loadedCountMap]);

  // Load More Handler (loads next 30 for parent)
  const handleLoadMore = useCallback((parentHost: string) => {
    const pItem = domainsMap.get(parentHost);
    const total = pItem ? pItem.children.length : 0;
    const current = loadedCountMap[parentHost] || DEFAULT_CHUNK_SIZE;
    const next = current + DEFAULT_CHUNK_SIZE;
    setLoadedCountMap((prev) => ({
      ...prev,
      [parentHost]: next,
    }));
    const loadedBatch = Math.min(DEFAULT_CHUNK_SIZE, Math.max(0, total - current));
    toast.success(`Loaded +${loadedBatch} subdomains for ${parentHost}`);
  }, [domainsMap, loadedCountMap]);

  // Expand / Collapse Toggle for any node
  const toggleExpand = useCallback((hostname: string) => {
    setExpandedHosts((prev) => {
      const next = new Set(prev);
      if (next.has(hostname)) {
        next.delete(hostname);
        toast.info(`Collapsed subdomains for ${hostname}`);
      } else {
        next.add(hostname);
        toast.info(`Expanded subdomains for ${hostname}`);
      }
      return next;
    });
    setActivePopover((prev) =>
      prev && prev.hostname === hostname ? { ...prev, isExpanded: !prev.isExpanded } : prev
    );
  }, []);

  // 3. Initialize Cytoscape Graph Instance strictly adhering to Section 4
  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: cytoscapeElements,
      layout: {
        name: 'preset',
        fit: true,
        padding: 50,
      },
      minZoom: 0.05,
      maxZoom: 3,
      boxSelectionEnabled: false,
      style: [
        // Subdomain nodes: orange background, black text, black border
        {
          selector: 'node',
          style: {
            shape: 'round-rectangle',
            'background-color': '#FF7900',
            'background-opacity': 1,
            'border-width': 1.5,
            'border-color': '#111111',
            label: 'data(label)',
            color: '#111111',
            'font-family': '"Space Grotesk", "JetBrains Mono", ui-monospace, monospace',
            'font-size': 11,
            'font-weight': 'bold',
            'text-wrap': 'wrap',
            'text-max-width': '220px',
            'text-valign': 'center',
            'text-halign': 'center',
            width: 240,
            height: 52,
            'overlay-opacity': 0,
          },
        },
        // Root domain node: orange background, black text, black border (prominent)
        {
          selector: 'node[?isRoot]',
          style: {
            shape: 'round-rectangle',
            'background-color': '#FF7900',
            'background-opacity': 1,
            'border-width': 2.5,
            'border-color': '#111111',
            color: '#111111',
            'font-size': 12,
            'font-weight': 'bold',
            width: 260,
            height: 60,
          },
        },
        // Load More Interactive Node (+ LOAD 30 MORE)
        {
          selector: 'node[?isLoadMore]',
          style: {
            shape: 'round-rectangle',
            'background-color': '#FFFFFF',
            'background-opacity': 1,
            'border-width': 1.5,
            'border-style': 'dashed',
            'border-color': '#111111',
            color: '#111111',
            'font-size': 11,
            'font-weight': 'bold',
            width: 240,
            height: 52,
          },
        },
        // Selected node: stronger black border
        {
          selector: 'node.selected-node',
          style: {
            'background-color': '#E66D00',
            'border-width': 3.5,
            'border-color': '#111111',
            color: '#111111',
          },
        },
        // Actively hunting node
        {
          selector: 'node.hunting-node',
          style: {
            'border-width': 2.5,
            'border-style': 'dashed',
            'border-color': '#111111',
            'background-color': '#FFB066',
          },
        },
        // Search & Filter Highlight
        {
          selector: 'node.highlighted-node',
          style: {
            'border-width': 3,
            'border-color': '#111111',
            'background-color': '#FFA04D',
            color: '#111111',
          },
        },
        // Dimmed nodes when filter is active
        {
          selector: 'node.dimmed-node',
          style: {
            opacity: 0.25,
          },
        },
        // Connections: orange lines
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#FF7900',
            'curve-style': 'taxi',
            'taxi-direction': 'horizontal',
            'target-arrow-shape': 'none',
            opacity: 1,
            'overlay-opacity': 0,
          },
        },
        // Load More Edge (dashed orange)
        {
          selector: 'edge[?isLoadMoreEdge]',
          style: {
            width: 1.5,
            'line-style': 'dashed',
            'line-color': '#FF7900',
            'target-arrow-shape': 'none',
            opacity: 0.8,
          },
        },
        // Dimmed edges
        {
          selector: 'edge.dimmed-edge',
          style: {
            opacity: 0.15,
          },
        },
      ] as cytoscape.StylesheetStyle[],
    });

    // Tap on node: handle Load More or open context popover + select entity
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const data = node.data();

      if (data.isLoadMore) {
        handleLoadMore(data.parentHost);
        return;
      }

      cy.nodes().removeClass('selected-node');
      node.addClass('selected-node');

      const renderedPos = node.renderedPosition();
      const nodeW = node.renderedWidth();
      const nodeH = node.renderedHeight();

      setSelectedEntity({
        hostname: data.hostname,
        isRoot: Boolean(data.isRoot),
        parent: data.parent || null,
        childrenCount: data.childrenCount || 0,
        status: data.status || 'new',
        depth: data.depth || 0,
      });

      setActivePopover({
        hostname: data.hostname,
        isRoot: Boolean(data.isRoot),
        parent: data.parent || null,
        childrenCount: data.childrenCount || 0,
        hasChildren: (data.childrenCount || 0) > 0,
        isExpanded: expandedHosts.has(data.hostname),
        status: data.status || 'new',
        depth: data.depth || 0,
        pos: { x: renderedPos.x, y: renderedPos.y },
        nodeSize: { width: nodeW, height: nodeH },
      });
    });

    // Double tap on node: quick toggle expand / collapse
    cy.on('dbltap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const data = node.data();
      if (data.isLoadMore) return;
      if ((data.childrenCount || 0) > 0) {
        toggleExpand(data.hostname);
      }
    });

    // Pan / Zoom: smoothly update popover position to follow node
    const handleTransform = () => {
      if (!cyRef.current) return;
      setActivePopover((curr) => {
        if (!curr) return null;
        const targetNode = cyRef.current!.getElementById(`host:${curr.hostname}`);
        if (!targetNode.length) return null;
        const p = targetNode.renderedPosition();
        return {
          ...curr,
          pos: { x: p.x, y: p.y },
          nodeSize: { width: targetNode.renderedWidth(), height: targetNode.renderedHeight() },
        };
      });
    };
    cy.on('pan zoom', handleTransform);

    // Tap on background to deselect & close popover
    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        cy.nodes().removeClass('selected-node');
        setSelectedEntity(null);
        setActivePopover(null);
      }
    });

    cyRef.current = cy;

    // Observe container resizing
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (cyRef.current) {
          cyRef.current.resize();
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      cy.destroy();
      cyRef.current = null;
    };
  }, [cytoscapeElements, handleLoadMore, toggleExpand, expandedHosts]);

  // Sync active hunts visual indicator onto Cytoscape nodes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const activeHosts = new Set(Object.keys(currentHunts));
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const host = n.data('hostname');
        if (host && activeHosts.has(host)) {
          n.addClass('hunting-node');
        } else {
          n.removeClass('hunting-node');
        }
      });
    });
  }, [currentHunts]);

  // Handle Esc key to exit fullscreen mode or close popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePopover) {
          setActivePopover(null);
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
          setTimeout(() => {
            if (cyRef.current) {
              cyRef.current.resize();
              cyRef.current.fit(undefined, 40);
            }
          }, 60);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, activePopover]);

  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 40);
      }
    }, 80);
  };

  // Quick filter by status from overview cards
  const handleQuickStatusFilter = (status: DomainStatus | 'all') => {
    const nextStatus = statusFilter === status ? 'all' : status;
    handleStatusFilterChange(nextStatus);
  };

  // Clear all filters & search
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepthInput('');
    setSearchFeedback(null);
    setActivePopover(null);

    const cy = cyRef.current;
    if (cy) {
      cy.batch(() => {
        cy.nodes().removeClass('dimmed-node highlighted-node selected-node');
        cy.edges().removeClass('dimmed-edge');
      });
      cy.fit(undefined, 40);
    }
  }, []);

  // Handle Search & Highlighting
  const handleSearch = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      handleClearFilters();
      return;
    }

    const matches = cy.nodes().filter((node) => {
      if (node.data('isLoadMore')) return false;
      const host = (node.data('hostname') || '').toLowerCase();
      return host.includes(query);
    });

    if (matches.length === 0) {
      // Check if domain exists in complete dataset
      let foundInDataset = false;
      for (const [host, item] of domainsMap.entries()) {
        if (host.toLowerCase().includes(query)) {
          foundInDataset = true;
          if (item.parent) {
            setExpandedHosts((prev) => new Set([...prev, item.parent!]));
            const pItem = domainsMap.get(item.parent);
            if (pItem) {
              const idx = pItem.children.indexOf(host);
              if (idx >= 0) {
                setLoadedCountMap((prev) => ({
                  ...prev,
                  [item.parent!]: Math.max(prev[item.parent!] || DEFAULT_CHUNK_SIZE, idx + 10),
                }));
              }
            }
          }
          break;
        }
      }

      if (foundInDataset) {
        setSearchFeedback(`Loaded asset for "${query}". Re-centering graph...`);
        setTimeout(() => {
          if (!cyRef.current) return;
          const target = cyRef.current.nodes().filter((n) => {
            const h = (n.data('hostname') || '').toLowerCase();
            return h.includes(query);
          });
          if (target.length) {
            cyRef.current.batch(() => {
              cyRef.current!.nodes().addClass('dimmed-node').removeClass('highlighted-node');
              cyRef.current!.edges().addClass('dimmed-edge');
              target.removeClass('dimmed-node').addClass('highlighted-node');
              target.connectedEdges().removeClass('dimmed-edge');
            });
            const firstTarget = target.first();
            if (firstTarget.length) {
              cyRef.current.animate({
                center: { eles: firstTarget },
                zoom: 1.2,
                duration: 350,
              });
            }
          }
        }, 150);
        return;
      }

      setSearchFeedback(`No assets matched: "${query}"`);
      return;
    }

    setSearchFeedback(`Identified ${matches.length} matching domain${matches.length === 1 ? '' : 's'}`);

    cy.batch(() => {
      cy.nodes().addClass('dimmed-node').removeClass('highlighted-node');
      cy.edges().addClass('dimmed-edge');

      matches.removeClass('dimmed-node').addClass('highlighted-node');

      matches.forEach((node) => {
        node.connectedEdges().removeClass('dimmed-edge');
      });
    });

    const firstMatch = matches[0];
    if (firstMatch) {
      cy.animate({
        center: { eles: firstMatch },
        zoom: 1.2,
        duration: 350,
      });
    }
  }, [searchQuery, domainsMap, handleClearFilters]);

  // Handle Status Filter
  const handleStatusFilterChange = useCallback((val: string) => {
    setStatusFilter(val);
    const cy = cyRef.current;
    if (!cy) return;

    if (val === 'all') {
      cy.batch(() => {
        cy.nodes().removeClass('dimmed-node highlighted-node');
        cy.edges().removeClass('dimmed-edge');
      });
      setSearchFeedback(null);
      return;
    }

    const matches = cy.nodes().filter((node) => {
      if (node.data('isLoadMore')) return false;
      const nodeStatus = node.data('status') || 'new';
      return nodeStatus === val;
    });

    setSearchFeedback(`Filter "${val}": ${matches.length} domain${matches.length === 1 ? '' : 's'}`);

    cy.batch(() => {
      cy.nodes().addClass('dimmed-node').removeClass('highlighted-node');
      cy.edges().addClass('dimmed-edge');

      matches.removeClass('dimmed-node').addClass('highlighted-node');
      matches.connectedEdges().removeClass('dimmed-edge');
    });
  }, []);

  // Handle Depth Filter
  const handleDepthFilter = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const level = parseInt(depthInput, 10);
    if (isNaN(level) || level < 0) {
      setSearchFeedback('Please enter a valid non-negative depth level number');
      return;
    }

    const matches = cy.nodes().filter((node) => {
      if (node.data('isLoadMore')) return false;
      const depth = node.data('depth');
      return depth === level;
    });

    if (matches.length === 0) {
      setSearchFeedback(`No domains located at depth level ${level}`);
      return;
    }

    setSearchFeedback(`Depth level ${level}: ${matches.length} domain${matches.length === 1 ? '' : 's'}`);

    cy.batch(() => {
      cy.nodes().addClass('dimmed-node').removeClass('highlighted-node');
      cy.edges().addClass('dimmed-edge');

      matches.removeClass('dimmed-node').addClass('highlighted-node');
      matches.connectedEdges().removeClass('dimmed-edge');
    });
  }, [depthInput]);

  // Zoom and Fit controls
  const handleZoomIn = () => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  const handleZoomOut = () => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  const handleFit = () => {
    const cy = cyRef.current;
    if (cy) cy.fit(undefined, 40);
  };

  const handleResetLayout = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().layout({ name: 'preset', fit: true, padding: 40 }).run();
    toast.info('Layout reset to standard tree positions');
  };

  // Copy hostname helper
  const handleCopyDomain = (host: string) => {
    navigator.clipboard.writeText(host);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  // Status Updater from inspector & floating popover menu
  const handleUpdateEntityStatus = async (hostname: string, newStatus: DomainStatus) => {
    setIsUpdatingStatus(true);
    try {
      if (onStatusChange) {
        await onStatusChange(hostname, newStatus);
      }
      const cy = cyRef.current;
      if (cy) {
        const node = cy.getElementById(`host:${hostname}`);
        if (node.length) {
          node.data('status', newStatus);
        }
      }
      setSelectedEntity((prev) => (prev && prev.hostname === hostname ? { ...prev, status: newStatus } : prev));
      setActivePopover((prev) => (prev && prev.hostname === hostname ? { ...prev, status: newStatus } : prev));
      const item = domainsMap.get(hostname);
      if (item) item.status = newStatus;
      toast.success(`Domain "${hostname}" marked as ${newStatus === 'success' ? 'Completed' : newStatus}`);
    } catch {
      toast.error(`Failed to update status for ${hostname}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Check if all subdomains are loaded
  const isAllLoaded = useMemo(() => {
    return roots.every((r) => {
      const total = domainsMap.get(r)?.children.length ?? 0;
      const count = loadedCountMap[r] || DEFAULT_CHUNK_SIZE;
      return count >= total;
    });
  }, [roots, domainsMap, loadedCountMap]);

  // Toggle Load All vs Reset to 30
  const handleToggleLoadAll = useCallback(() => {
    if (isAllLoaded) {
      setLoadedCountMap({});
      toast.info('Reset display limit to 30 subdomains per target');
    } else {
      const fullMap: Record<string, number> = {};
      for (const [host, item] of domainsMap.entries()) {
        if (item.children.length > 0) {
          fullMap[host] = item.children.length;
        }
      }
      setLoadedCountMap(fullMap);
      toast.info(`Loaded all ${totalAssets} assets into canvas view`);
    }
  }, [isAllLoaded, domainsMap, totalAssets]);

  // Visible domain nodes count in Cytoscape
  const visibleNodesCount = useMemo(() => {
    return cytoscapeElements.filter((e) => e.group === 'nodes' && !e.data?.isLoadMore).length;
  }, [cytoscapeElements]);

  // Check if there are more subdomains remaining to load
  const hasRemainingNodes = useMemo(() => {
    return cytoscapeElements.some((e) => e.group === 'nodes' && e.data?.isLoadMore);
  }, [cytoscapeElements]);

  // Quick Load 30 More for the primary root domain from toolbar
  const handleLoadMorePrimary = useCallback(() => {
    const primary = roots[0];
    if (primary) {
      handleLoadMore(primary);
    }
  }, [roots, handleLoadMore]);

  // Popover placement calculation within container bounds
  const getPopoverCoords = () => {
    if (!activePopover || !containerRef.current) return { left: 0, top: 0 };
    const cWidth = containerRef.current.clientWidth || 800;
    const cHeight = containerRef.current.clientHeight || 600;
    const popoverWidth = 260;
    const popoverHeight = 250;

    let left = activePopover.pos.x + activePopover.nodeSize.width / 2 + 14;
    if (left + popoverWidth > cWidth - 12) {
      left = activePopover.pos.x - activePopover.nodeSize.width / 2 - popoverWidth - 14;
    }
    left = Math.max(12, Math.min(cWidth - popoverWidth - 12, left));

    let top = activePopover.pos.y - 50;
    if (top + popoverHeight > cHeight - 12) {
      top = cHeight - popoverHeight - 12;
    }
    top = Math.max(12, top);

    return { left, top };
  };

  const popoverCoords = getPopoverCoords();

  // Export as JSON
  const handleExportJson = () => {
    const cyJson = cyRef.current?.json()?.elements;
    const finalGraphElements =
      cyJson?.nodes && cyJson.nodes.length > 0 ? cyJson : rawElementsMap;

    const payload = {
      app: 'SubsRecon',
      exportType: 'DomainMappingTree',
      exportedAt: new Date().toISOString(),
      campaign: {
        id: recon.id,
        name: recon.name,
        reportTo: recon.reportTo,
        status: recon.status,
        domains: recon.domains || [],
        createdAt: recon.createdAt,
        completedAt: recon.completedAt,
        database: recon.database,
      },
      attackSurfaceOverview: {
        rootDomainsCount: roots.length,
        totalSubdomainsCount: subdomainsCount,
        totalAssetsCount: totalAssets,
        maximumDepth: maxDepth,
        statusBreakdown: {
          new: statusCounts.new || 0,
          pending: statusCounts.pending || 0,
          completed: statusCounts.success || 0,
        },
      },
      treeHierarchy: treeExportHierarchy,
      subdomains: recon.subdomains || [],
      relationships: recon.relationships || [],
      domainStatuses: recon.domainStatuses || {},
      graphElements: finalGraphElements,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (recon.name || 'subsrecon').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.download = `subsrecon-${safeName}-mapping.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Exported JSON map: subsrecon-${safeName}-mapping.json`);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Header / View Label & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCDCDC]">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsSidebarOpen(!isSidebarOpen);
              setTimeout(() => {
                if (cyRef.current) {
                  cyRef.current.resize();
                }
              }, 60);
            }}
            className="p-1.5"
            title={isSidebarOpen ? 'Collapse Target Intel' : 'Expand Target Intel'}
            aria-label={isSidebarOpen ? 'Collapse Target Intel' : 'Expand Target Intel'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4 text-primary" />}
          </Button>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#666666] mb-0.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>ENTITY RELATIONSHIP VIEW</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
              Subs Graph
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 font-mono">
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportJson}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            EXPORT JSON ↗
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Side Stats & Target Intelligence + Right Side Canvas */}
      <div className={`grid grid-cols-1 ${isSidebarOpen ? 'lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'} gap-4 items-start`}>
        {/* Left Side: Target Intelligence & Attack Surface Overview */}
        {isSidebarOpen && (
          <aside className="lg:col-span-1 xl:col-span-1 p-4 sm:p-5 bg-white border border-[#DCDCDC] rounded-[3px] space-y-4 shadow-sm animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono uppercase text-[#666666] font-bold tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span>01 / TARGET INTELLIGENCE</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight truncate mt-1">
                {recon.name}
              </h1>
            </div>

            <div className="space-y-3 text-xs border-y border-[#DCDCDC] py-3.5 font-mono">
              <div>
                <span className="text-[10px] uppercase text-[#666666] font-bold block tracking-wider">
                  REPORT TO
                </span>
                <strong className="text-[#111111] text-xs truncate block mt-0.5 font-mono">
                  {recon.reportTo || '—'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#666666] font-bold block tracking-wider">
                  CREATED
                </span>
                <strong className="text-[#111111] text-xs block mt-0.5 font-mono">
                  {recon.createdAt ? format(parseISO(recon.createdAt), 'dd/MM/yyyy, HH:mm:ss') : '—'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#666666] font-bold block tracking-wider">
                  IN-SCOPE DOMAINS
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {roots.map((dom) => (
                    <span
                      key={dom}
                      className="px-2 py-0.5 rounded-[2px] bg-[#FAFAFA] border border-[#DCDCDC] text-xs font-mono text-[#111111]"
                    >
                      {dom}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Attack Surface Overview Stats (with Interactive Quick Filters) */}
            <div className="space-y-1 font-mono text-xs">
              <span className="text-[11px] uppercase text-[#666666] font-bold tracking-wider block mb-2">
                ATTACK SURFACE OVERVIEW
              </span>

              <div className="flex items-center justify-between py-1.5 px-2 border-b border-[#DCDCDC]">
                <span className="text-[#666666]">Root domains</span>
                <strong className="text-[#111111] font-bold">{roots.length}</strong>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 border-b border-[#DCDCDC]">
                <span className="text-[#666666]">Total subdomains</span>
                <strong className="text-primary font-bold">{subdomainsCount}</strong>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 border-b border-[#DCDCDC]">
                <span className="text-[#666666]">Total assets</span>
                <strong className="text-[#111111] font-bold">{totalAssets}</strong>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 border-b border-[#DCDCDC]">
                <span className="text-[#666666]">Maximum depth</span>
                <strong className="text-[#111111] font-bold">{maxDepth} levels</strong>
              </div>

              <div
                onClick={() => handleQuickStatusFilter('pending')}
                className={`flex items-center justify-between py-1.5 px-2 rounded-[2px] cursor-pointer transition-colors border-b border-[#DCDCDC] ${
                  statusFilter === 'pending'
                    ? 'bg-[#FFF7ED] border border-primary'
                    : 'hover:bg-[#FAFAFA]'
                }`}
                title="Filter by Pending"
              >
                <span className="text-[#666666] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Pending
                </span>
                <strong className="text-[#111111] font-bold">{statusCounts.pending || 0}</strong>
              </div>

              <div
                onClick={() => handleQuickStatusFilter('success')}
                className={`flex items-center justify-between py-1.5 px-2 rounded-[2px] cursor-pointer transition-colors border-b border-[#DCDCDC] ${
                  statusFilter === 'success'
                    ? 'bg-success-light border border-success'
                    : 'hover:bg-[#FAFAFA]'
                }`}
                title="Filter by Completed"
              >
                <span className="text-[#666666] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Completed
                </span>
                <strong className="text-[#111111] font-bold">{statusCounts.success || 0}</strong>
              </div>

              <div
                onClick={() => handleQuickStatusFilter('new')}
                className={`flex items-center justify-between py-1.5 px-2 rounded-[2px] cursor-pointer transition-colors ${
                  statusFilter === 'new'
                    ? 'bg-[#FAFAFA] border border-[#111111]'
                    : 'hover:bg-[#FAFAFA]'
                }`}
                title="Filter by New"
              >
                <span className="text-[#666666] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#888888]" />
                  New
                </span>
                <strong className="text-[#111111] font-bold">{statusCounts.new || 0}</strong>
              </div>
            </div>
          </aside>
        )}

        {/* Right Side: Graph Canvas & Inspector */}
        <section className={`${isSidebarOpen ? 'lg:col-span-3 xl:col-span-4' : 'col-span-full'} space-y-4`}>
          <div
            className={`p-4 sm:p-5 bg-white border border-[#DCDCDC] rounded-[3px] space-y-3.5 shadow-sm ${
              isFullscreen
                ? 'fixed inset-0 z-50 p-4 sm:p-6 bg-white flex flex-col rounded-none'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
              <span className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span>GRAPH CANVAS</span>
              </span>

              {/* View Status & Quick Chunk Loading Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#111111] px-2.5 py-1 rounded-[2px] bg-[#FAFAFA] border border-[#DCDCDC] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {visibleNodesCount} / {totalAssets} ENTITIES
                  </span>
                </span>

                {hasRemainingNodes && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleLoadMorePrimary}
                    leftIcon={<Plus className="w-3.5 h-3.5 text-[#111111]" />}
                  >
                    + Load 30 More
                  </Button>
                )}

                {totalAssets > DEFAULT_CHUNK_SIZE && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleToggleLoadAll}
                  >
                    {isAllLoaded ? 'Reset to 30' : 'Load All'}
                  </Button>
                )}

                <button
                  onClick={handleToggleFullscreen}
                  className="p-1.5 text-[#111111] hover:text-primary rounded-[2px] border border-[#111111] hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Canvas Filter & Search Toolbar (White background, dark text, orange focus) */}
            <div className="flex flex-wrap items-center gap-2.5 font-mono">
              <div className="flex-1 min-w-[220px]">
                <Input
                  placeholder="Search domain, e.g. hack.cappriciosec.com"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  leftIcon={<Search className="w-3.5 h-3.5 text-primary" />}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                aria-label="Filter domains by status"
                className="w-36 sm:w-40 bg-white border border-[#DCDCDC] text-xs rounded-[3px] px-3 py-2 text-[#111111] focus:outline-none focus:border-primary font-mono cursor-pointer"
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="pending">Pending</option>
                <option value="success">Completed</option>
              </select>

              <Button variant="secondary" size="sm" onClick={handleSearch}>
                Search
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear
              </Button>

              <div className="flex items-center gap-2 pl-2 border-l border-[#DCDCDC]">
                <input
                  type="number"
                  min={0}
                  max={20}
                  placeholder="Depth level"
                  value={depthInput}
                  onChange={(e) => setDepthInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDepthFilter();
                  }}
                  aria-label="Subdomain depth level"
                  className="w-28 sm:w-32 bg-white border border-[#DCDCDC] text-xs rounded-[3px] px-3 py-2 text-[#111111] focus:outline-none focus:border-primary font-mono"
                />
                <Button variant="primary" size="sm" onClick={handleDepthFilter}>
                  Go
                </Button>
              </div>
            </div>

            {searchFeedback && (
              <p className="text-xs font-mono text-[#111111] font-bold animate-fadeIn flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>&gt; {searchFeedback}</span>
              </p>
            )}

            {/* Cytoscape Container with Subtle Orange Dotted Grid Background */}
            <div className={`relative border border-[#DCDCDC] rounded-[3px] overflow-hidden ${isFullscreen ? 'flex-1 min-h-[400px]' : ''}`}>
              {/* Active Hunt Floating Indicator on the Graph Viewer */}
              {isAnyHunting && (
                huntEntries.length === 1 ? (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-xs border border-[#111111] px-5 py-3 rounded-[3px] shadow-lg flex flex-col gap-2 font-mono animate-fadeIn pointer-events-auto min-w-[340px] max-w-md">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[3px] bg-[#FFF7ED] border border-primary flex items-center justify-center shrink-0">
                        <Radar className="w-4.5 h-4.5 text-primary animate-radar-sweep" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                              HUNT:
                            </span>
                            <span className="text-xs font-mono font-bold text-primary truncate">
                              {firstHuntHost}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold bg-[#111111] text-white px-2 py-0.5 rounded-[2px] shrink-0">
                            {firstHuntElapsed}s
                          </span>
                        </div>
                        <p className="text-[11px] text-[#666666] flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                          <span className="truncate">Subfinder enumeration in progress...</span>
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(95, Math.max(12, (firstHuntElapsed / 40) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-xs border border-[#111111] px-5 py-3 rounded-[3px] shadow-xl flex flex-col gap-2.5 font-mono animate-fadeIn pointer-events-auto min-w-[380px] max-w-lg">
                    <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-[2px] bg-[#FFF7ED] border border-primary flex items-center justify-center shrink-0">
                          <Radar className="w-3.5 h-3.5 text-primary animate-radar-sweep" />
                        </div>
                        <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                          ACTIVE HUNTS ({huntEntries.length} RUNNING)
                        </span>
                      </div>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {huntEntries.map(([host, elapsed]) => (
                        <div
                          key={host}
                          className="p-2 bg-[#FAFAFA] border border-[#DCDCDC] rounded-[2px] space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#111111] truncate max-w-[260px]">
                              {host}
                            </span>
                            <span className="text-[10px] font-bold bg-[#111111] text-white px-1.5 py-0.2 rounded-[2px] shrink-0">
                              {elapsed}s
                            </span>
                          </div>
                          <div className="w-full bg-[#E5E5E5] h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(95, Math.max(10, (elapsed / 40) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}

              {cytoscapeElements.length === 0 && (
                <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                  <Loader size="md" text="Loading asset topology..." />
                </div>
              )}

              <div
                ref={containerRef}
                className={`w-full ${isFullscreen ? 'h-full min-h-[400px]' : 'h-[720px] lg:h-[780px] xl:h-[840px]'} cursor-grab active:cursor-grabbing`}
                style={{
                  backgroundColor: '#FAFAFA',
                  backgroundImage:
                    'radial-gradient(rgba(255, 121, 0, 0.35) 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Floating Context Menu Popover (anchored on clicked node) */}
              {activePopover && (
                <div
                  className="absolute z-30 animate-fadeIn pointer-events-auto"
                  style={{
                    left: `${popoverCoords.left}px`,
                    top: `${popoverCoords.top}px`,
                    width: '260px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-white border-2 border-[#111111] rounded-[3px] shadow-lg p-4 text-xs font-mono space-y-3">
                    {/* Header: Domain name & close button */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#DCDCDC]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            activePopover.status === 'success'
                              ? 'bg-success'
                              : activePopover.status === 'pending'
                              ? 'bg-primary'
                              : 'bg-[#888888]'
                          }`}
                        />
                        <h4
                          className="text-sm font-bold text-[#111111] truncate tracking-tight"
                          title={activePopover.hostname}
                        >
                          {activePopover.hostname}
                        </h4>
                      </div>
                      <button
                        onClick={() => setActivePopover(null)}
                        className="text-[#666666] hover:text-[#111111] p-1 rounded hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        title="Close menu"
                        aria-label="Close menu"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Action 1: Hunt more subdomains */}
                    {onHunt && (
                      <button
                        disabled={currentHunts[activePopover.hostname] !== undefined}
                        onClick={() => {
                          if (currentHunts[activePopover.hostname] !== undefined) return;
                          onHunt(activePopover.hostname);
                          setActivePopover(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[2px] transition-colors font-mono text-xs text-left font-bold border ${
                          currentHunts[activePopover.hostname] !== undefined
                            ? 'bg-[#FFF7ED] text-primary border-primary/50 cursor-not-allowed opacity-90'
                            : 'text-[#111111] hover:text-primary bg-[#FAFAFA] hover:bg-[#FFF7ED] border-[#111111] cursor-pointer'
                        }`}
                      >
                        {currentHunts[activePopover.hostname] !== undefined ? (
                          <>
                            <Activity className="w-4 h-4 text-primary animate-spin shrink-0" />
                            <span className="truncate">
                              Hunt running ({currentHunts[activePopover.hostname]}s)...
                            </span>
                          </>
                        ) : (
                          <>
                            <Crosshair className="w-4 h-4 text-primary shrink-0" />
                            <span>Hunt more subdomains</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Action 2: Expand / Collapse Subdomains */}
                    {activePopover.hasChildren && (
                      <button
                        onClick={() => toggleExpand(activePopover.hostname)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-[2px] text-[#111111] hover:text-primary bg-[#FAFAFA] hover:bg-[#FFF7ED] border border-[#DCDCDC] transition-colors font-mono text-xs cursor-pointer font-bold"
                      >
                        <span className="text-[#666666] flex items-center gap-1.5">
                          {activePopover.isExpanded ? (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 text-primary" />
                              <span>Collapse subdomains</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-3.5 h-3.5 text-primary" />
                              <span>Expand subdomains</span>
                            </>
                          )}
                        </span>
                        <span className="text-primary font-bold">
                          {activePopover.isExpanded
                            ? `[-] ${activePopover.childrenCount}`
                            : `[+] ${activePopover.childrenCount}`}
                        </span>
                      </button>
                    )}

                    {/* Section: SET STATUS */}
                    <div className="border-t border-[#DCDCDC] pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#666666] block mb-2 font-mono">
                        SET STATUS
                      </span>
                      <div className="space-y-1">
                        {/* New */}
                        <button
                          onClick={() => handleUpdateEntityStatus(activePopover.hostname, 'new')}
                          disabled={isUpdatingStatus}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[2px] text-xs font-mono transition-colors cursor-pointer border ${
                            activePopover.status === 'new'
                              ? 'bg-[#FAFAFA] text-[#111111] border-[#111111] font-bold'
                              : 'text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA] border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#888888]" />
                            <span>New</span>
                          </span>
                          {activePopover.status === 'new' && <Check className="w-3.5 h-3.5 text-[#111111]" />}
                        </button>

                        {/* Pending */}
                        <button
                          onClick={() => handleUpdateEntityStatus(activePopover.hostname, 'pending')}
                          disabled={isUpdatingStatus}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[2px] text-xs font-mono transition-colors cursor-pointer border ${
                            activePopover.status === 'pending'
                              ? 'bg-[#FFF7ED] text-primary border-primary font-bold'
                              : 'text-[#666666] hover:text-primary hover:bg-[#FFF7ED] border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            <span>Pending</span>
                          </span>
                          {activePopover.status === 'pending' && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>

                        {/* Completed */}
                        <button
                          onClick={() => handleUpdateEntityStatus(activePopover.hostname, 'success')}
                          disabled={isUpdatingStatus}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[2px] text-xs font-mono transition-colors cursor-pointer border ${
                            activePopover.status === 'success'
                              ? 'bg-success-light text-success border-success font-bold'
                              : 'text-[#666666] hover:text-success hover:bg-success-light border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-success" />
                            <span>Completed</span>
                          </span>
                          {activePopover.status === 'success' && <Check className="w-3.5 h-3.5 text-success" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Graph Toolbar: White background with black borders */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-white border border-[#111111] p-1 rounded-[3px] shadow-sm font-mono z-10">
                <button
                  onClick={handleZoomIn}
                  title="Zoom In"
                  aria-label="Zoom In"
                  className="p-1.5 text-[#111111] hover:text-primary hover:bg-[#FFF7ED] rounded-[2px] transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  aria-label="Zoom Out"
                  className="p-1.5 text-[#111111] hover:text-primary hover:bg-[#FFF7ED] rounded-[2px] transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFit}
                  title="Fit to Canvas"
                  aria-label="Fit to Canvas"
                  className="p-1.5 text-[#111111] hover:text-primary hover:bg-[#FFF7ED] rounded-[2px] transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetLayout}
                  title="Re-align Tree Layout"
                  aria-label="Re-align Tree Layout"
                  className="p-1.5 text-[#111111] hover:text-primary hover:bg-[#FFF7ED] rounded-[2px] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                  className={`p-1.5 rounded-[2px] transition-colors cursor-pointer ${
                    isFullscreen
                      ? 'text-primary bg-[#FFF7ED]'
                      : 'text-[#111111] hover:text-primary hover:bg-[#FFF7ED]'
                  }`}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>

              {/* Bottom Instructions Hint */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none font-mono">
                <span className="px-3.5 py-1 bg-white border border-[#111111] text-[10px] text-[#111111] font-bold rounded-[2px] shadow-sm">
                  DRAG NODES TO REARRANGE • SCROLL TO ZOOM
                </span>
              </div>
            </div>
          </div>

          {/* Selected Entity Inspector Panel */}
          {selectedEntity && (
            <div className="p-4 sm:p-5 bg-white rounded-[3px] flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#111111] shadow-sm animate-fadeIn">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-bold flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-primary" />
                    <span>SELECTED ENTITY</span>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedEntity(null);
                      setActivePopover(null);
                      if (cyRef.current) {
                        cyRef.current.nodes().removeClass('selected-node');
                      }
                    }}
                    className="text-[#666666] hover:text-[#111111] p-1 rounded hover:bg-[#FAFAFA] transition-colors md:hidden cursor-pointer"
                    title="Close inspector"
                    aria-label="Close inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight flex items-center gap-2 truncate">
                    <span className="truncate">{selectedEntity.hostname}</span>
                    <button
                      onClick={() => handleCopyDomain(selectedEntity.hostname)}
                      className="text-[#666666] hover:text-primary p-1 transition-colors cursor-pointer shrink-0"
                      title="Copy domain name"
                      aria-label="Copy domain name"
                    >
                      {copiedDomain ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </h3>
                  <p className="text-xs text-[#666666] font-sans mt-0.5 truncate">
                    {selectedEntity.isRoot
                      ? 'Root domain'
                      : `Subdomain (Level ${selectedEntity.depth})`}
                    {selectedEntity.parent && (
                      <span className="text-[#888888]"> • Parent: {selectedEntity.parent}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-mono shrink-0">
                <div className="text-xs text-[#111111] bg-[#FAFAFA] px-3 py-1.5 rounded-[2px] border border-[#DCDCDC]">
                  <span className="text-[#666666]">Direct:</span>{' '}
                  <strong className="text-primary">{selectedEntity.childrenCount}</strong>
                  {' • '}
                  <span className="text-[#666666]">Status:</span>{' '}
                  <span
                    className={`font-bold uppercase px-2 py-0.5 rounded-[2px] text-[11px] ${
                      selectedEntity.status === 'success'
                        ? 'bg-success-light text-success border border-[#BBF7D0]'
                        : selectedEntity.status === 'pending'
                        ? 'bg-[#FFF7ED] text-primary border border-primary/40'
                        : 'bg-[#FAFAFA] text-[#666666] border border-[#DCDCDC]'
                    }`}
                  >
                    {selectedEntity.status === 'success' ? 'Completed' : selectedEntity.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedEntity.status}
                    disabled={isUpdatingStatus}
                    onChange={(e) =>
                      handleUpdateEntityStatus(selectedEntity.hostname, e.target.value as DomainStatus)
                    }
                    aria-label="Update triage status"
                    className="bg-white border border-[#111111] rounded-[2px] px-2.5 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-primary cursor-pointer font-mono font-bold"
                  >
                    <option value="new">Status: New</option>
                    <option value="pending">Status: Pending</option>
                    <option value="success">Status: Completed</option>
                  </select>

                  {onHunt && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={currentHunts[selectedEntity.hostname] !== undefined}
                      onClick={() => onHunt(selectedEntity.hostname)}
                      leftIcon={
                        currentHunts[selectedEntity.hostname] !== undefined ? (
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Crosshair className="w-3.5 h-3.5" />
                        )
                      }
                    >
                      {currentHunts[selectedEntity.hostname] !== undefined
                        ? `Hunting (${currentHunts[selectedEntity.hostname]}s)...`
                        : 'Hunt'}
                    </Button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedEntity(null);
                      setActivePopover(null);
                      if (cyRef.current) {
                        cyRef.current.nodes().removeClass('selected-node');
                      }
                    }}
                    className="hidden md:flex text-[#666666] hover:text-[#111111] p-1.5 rounded hover:bg-[#FAFAFA] transition-colors ml-1 cursor-pointer"
                    title="Close inspector"
                    aria-label="Close inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReconMappingGraph;
