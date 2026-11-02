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
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ReconDetail, DomainStatus, SubdomainEntry, ReconRelationship } from '@/types/api';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';

export interface ReconMappingGraphProps {
  recon: ReconDetail;
  onHunt?: (hostname: string) => void;
  onStatusChange?: (hostname: string, newStatus: DomainStatus) => Promise<void>;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [depthInput, setDepthInput] = useState<string>('');
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Selected Entity state
  const [selectedEntity, setSelectedEntity] = useState<{
    hostname: string;
    isRoot: boolean;
    parent: string | null;
    childrenCount: number;
    status: DomainStatus;
    depth: number;
  } | null>(null);

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
    // (longest matching host in dataset that is a proper suffix)
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

  // 2. Deterministic Node Coordinates Layout Calculation
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

    // Recursive subtree layout calculation
    const layoutTreeForRoot = (root: string): TreeExportData => {
      // 1. Build export structure
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

      const exportData = buildExport(root, 0);

      // 2. Position nodes: Root is centered at (0, rootY)
      const rootY = currentGlobalY;
      positions.set(root, { x: 0, y: rootY });

      // Layout left leaf nodes: x < 0
      const leftLeaves = exportData.leftChildren;
      const leftTotalHeight = Math.max(1, leftLeaves.length) * SLOT_HEIGHT;
      let leftStartY = rootY - (leftTotalHeight / 2) + (SLOT_HEIGHT / 2);
      leftLeaves.forEach((leaf) => {
        positions.set(leaf.hostname, { x: -HORIZONTAL_GAP, y: leftStartY });
        leftStartY += SLOT_HEIGHT;
      });

      // Layout right branches and their descendants: x > 0
      const layoutRightBranch = (node: TreeExportData, branchDepth: number): { minY: number; maxY: number; centerY: number } => {
        const x = branchDepth * HORIZONTAL_GAP;
        const subChildren = node.rightChildren;

        if (subChildren.length === 0) {
          const y = currentGlobalY;
          currentGlobalY += SLOT_HEIGHT;
          positions.set(node.hostname, { x, y });
          return { minY: y, maxY: y, centerY: y };
        }

        const childCenters: number[] = [];
        let minChildY = Infinity;
        let maxChildY = -Infinity;

        for (const sub of subChildren) {
          const res = layoutRightBranch(sub, branchDepth + 1);
          childCenters.push(res.centerY);
          if (res.minY < minChildY) minChildY = res.minY;
          if (res.maxY > maxChildY) maxChildY = res.maxY;
        }

        const centerY = ((childCenters[0] ?? 0) + (childCenters[childCenters.length - 1] ?? 0)) / 2;
        positions.set(node.hostname, { x, y: centerY });
        return { minY: minChildY, maxY: maxChildY, centerY };
      };

      const rightBranches = exportData.rightChildren;
      if (rightBranches.length > 0) {
        for (const branch of rightBranches) {
          layoutRightBranch(branch, 1);
        }
      }

      currentGlobalY = Math.max(currentGlobalY, rootY + (leftLeaves.length * SLOT_HEIGHT) / 2) + 80;
      return exportData;
    };

    for (const r of roots) {
      treeExportList.push(layoutTreeForRoot(r));
    }

    // Build Cytoscape element objects (nodes & edges)
    const elements: cytoscape.ElementDefinition[] = [];

    for (const [host, item] of domainsMap.entries()) {
      const pos = positions.get(host) || { x: 0, y: 0 };
      const childCount = item.children.length;

      let label = host;
      if (item.isRoot) {
        label = `◆ ${host}\n[ ${childCount} DIRECT SUBDOMAINS ]`;
      } else if (childCount > 0) {
        label = `▼ ${host}\n[ +${childCount} ASSETS ]`;
      } else {
        label = `● ${host}`;
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
          label,
        } as cytoscape.NodeDataDefinition,
        position: pos,
        grabbable: true,
      });

      // Edge from parent
      if (item.parent && domainsMap.has(item.parent)) {
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
  }, [roots, domainsMap]);

  // 3. Initialize Cytoscape Graph Instance with Exact System Colors
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
        // General Node Styling (Dark Cyber Obsidian Card)
        {
          selector: 'node',
          style: {
            shape: 'round-rectangle',
            'background-color': '#091224',
            'background-opacity': 0.95,
            'border-width': 1.5,
            'border-color': '#00F0FF',
            label: 'data(label)',
            color: '#FFFFFF',
            'font-family': '"JetBrains Mono", ui-monospace, monospace',
            'font-size': 11,
            'font-weight': 'bold' as any,
            'text-wrap': 'wrap',
            'text-max-width': '220px',
            'text-valign': 'center',
            'text-halign': 'center',
            width: 250,
            height: 56,
            'overlay-opacity': 0,
          },
        },
        // Root Domain Node (prominent Neon Hacker Emerald #00FF88)
        {
          selector: 'node[?isRoot]',
          style: {
            shape: 'round-rectangle',
            'background-color': '#081C15',
            'background-opacity': 0.98,
            'border-width': 2.5,
            'border-color': '#00FF88',
            color: '#00FF88',
            'font-size': 12,
            width: 270,
            height: 64,
          },
        },
        // Status: Completed (#00FF88)
        {
          selector: 'node[status = "success"]',
          style: {
            'border-color': '#00FF88',
          },
        },
        // Status: Pending (#FFB000)
        {
          selector: 'node[status = "pending"]',
          style: {
            'border-color': '#FFB000',
          },
        },
        // Status: New (#00F0FF)
        {
          selector: 'node[status = "new"]',
          style: {
            'border-color': '#00F0FF',
          },
        },
        // Active Selection
        {
          selector: 'node.selected-node',
          style: {
            'background-color': '#0E2544',
            'border-width': 3,
            'border-color': '#FFFFFF',
            color: '#FFFFFF',
          },
        },
        // Search & Filter Highlight
        {
          selector: 'node.highlighted-node',
          style: {
            'border-width': 3,
            'border-color': '#00FF88',
            'background-color': '#052A18',
            color: '#00FF88',
          },
        },
        // Dimmed nodes when filter is active
        {
          selector: 'node.dimmed-node',
          style: {
            opacity: 0.15,
          },
        },
        // Edge styling (Neon Emerald Laser)
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#00FF88',
            'curve-style': 'taxi',
            'taxi-direction': 'horizontal',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#00FF88',
            'arrow-scale': 0.8,
            opacity: 0.75,
            'overlay-opacity': 0,
          },
        },
        // Dimmed edges
        {
          selector: 'edge.dimmed-edge',
          style: {
            opacity: 0.05,
          },
        },
      ] as any,
    });

    // Tap on node to select entity
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const data = node.data();

      cy.nodes().removeClass('selected-node');
      node.addClass('selected-node');

      setSelectedEntity({
        hostname: data.hostname,
        isRoot: Boolean(data.isRoot),
        parent: data.parent || null,
        childrenCount: data.childrenCount || 0,
        status: data.status || 'new',
        depth: data.depth || 0,
      });
    });

    // Tap on background to deselect
    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        cy.nodes().removeClass('selected-node');
        setSelectedEntity(null);
      }
    });

    cyRef.current = cy;

    // Observe container resizing (e.g. sidebar collapse/expand, fullscreen, window resize)
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
  }, [cytoscapeElements]);

  // Handle Esc key to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(() => {
          if (cyRef.current) {
            cyRef.current.resize();
            cyRef.current.fit(undefined, 40);
          }
        }, 60);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

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
      const host = (node.data('hostname') || '').toLowerCase();
      return host.includes(query);
    });

    if (matches.length === 0) {
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

    // Center and zoom to the first matching node
    const firstMatch = matches[0];
    if (firstMatch) {
      cy.animate({
        center: { eles: firstMatch },
        zoom: 1.2,
        duration: 350,
      });
    }
  }, [searchQuery]);

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

  // Clear all filters & search
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepthInput('');
    setSearchFeedback(null);

    const cy = cyRef.current;
    if (cy) {
      cy.batch(() => {
        cy.nodes().removeClass('dimmed-node highlighted-node selected-node');
        cy.edges().removeClass('dimmed-edge');
      });
      cy.fit(undefined, 40);
    }
  }, []);

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

  // Status Updater from inspector
  const handleUpdateEntityStatus = async (hostname: string, newStatus: DomainStatus) => {
    if (!onStatusChange) return;
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(hostname, newStatus);
      const cy = cyRef.current;
      if (cy) {
        const node = cy.getElementById(`host:${hostname}`);
        if (node.length) {
          node.data('status', newStatus);
        }
      }
      setSelectedEntity((prev) => (prev ? { ...prev, status: newStatus } : null));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-border/80">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsSidebarOpen(!isSidebarOpen);
              setTimeout(() => {
                if (cyRef.current) {
                  cyRef.current.resize();
                }
              }, 60);
            }}
            className="p-1.5 text-dark-muted hover:text-primary border border-dark-border/60 hover:border-primary/40 rounded-lg"
            title={isSidebarOpen ? 'Collapse Target Intel' : 'Expand Target Intel'}
            aria-label={isSidebarOpen ? 'Collapse Target Intel' : 'Expand Target Intel'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4 text-primary" />}
          </Button>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary mb-0.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00FF88]" />
              <span>ENTITY RELATIONSHIP VIEW</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-tech font-bold tracking-wider text-white uppercase">
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
          <aside className="lg:col-span-1 xl:col-span-1 p-4 sm:p-5 cyber-panel rounded-xl space-y-4 relative cyber-corners shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono uppercase text-primary font-bold tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span>01 / TARGET INTELLIGENCE</span>
              </span>
              <h1 className="text-xl font-tech font-bold text-white tracking-wide truncate mt-1">
                {recon.name}
              </h1>
            </div>

            <div className="space-y-3 text-xs border-y border-dark-border/80 py-3.5 font-mono">
              <div>
                <span className="text-[10px] uppercase text-dark-muted font-semibold block tracking-wider">
                  REPORT TO
                </span>
                <strong className="text-dark-text text-xs truncate block mt-0.5 font-mono">
                  {recon.reportTo || '—'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-dark-muted font-semibold block tracking-wider">
                  CREATED
                </span>
                <strong className="text-dark-text text-xs block mt-0.5 font-mono">
                  {recon.createdAt ? format(parseISO(recon.createdAt), 'dd/MM/yyyy, HH:mm:ss') : '—'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-dark-muted font-semibold block tracking-wider">
                  IN-SCOPE DOMAINS
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {roots.map((dom) => (
                    <span
                      key={dom}
                      className="px-2 py-0.5 rounded bg-dark-bg/90 border border-primary/30 text-xs font-mono text-primary shadow-sm"
                    >
                      {dom}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Attack Surface Overview Stats (with Interactive Quick Filters) */}
            <div className="space-y-1 font-mono text-xs">
              <span className="text-[11px] uppercase text-cyber-cyan font-bold tracking-wider block mb-2">
                ATTACK SURFACE OVERVIEW
              </span>

              <div className="flex items-center justify-between py-1.5 px-2 border-b border-dark-border/50">
                <span className="text-dark-muted">Root domains</span>
                <strong className="text-white font-bold">{roots.length}</strong>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 border-b border-dark-border/50">
                <span className="text-dark-muted">Total subdomains</span>
                <strong className="text-primary font-bold">{subdomainsCount}</strong>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 border-b border-dark-border/50">
                <span className="text-dark-muted">Total assets</span>
                <strong className="text-white font-bold">{totalAssets}</strong>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 border-b border-dark-border/50">
                <span className="text-dark-muted">Maximum depth</span>
                <strong className="text-cyber-cyan font-bold">{maxDepth} levels</strong>
              </div>

              <div
                onClick={() => handleQuickStatusFilter('pending')}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors border-b border-dark-border/50 ${
                  statusFilter === 'pending'
                    ? 'bg-warning/15 border border-warning/40'
                    : 'hover:bg-dark-card/60'
                }`}
                title="Filter by Pending"
              >
                <span className="text-warning flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 rounded-full bg-warning shadow-[0_0_8px_#FFB000]" />
                  Pending
                </span>
                <strong className="text-white">{statusCounts.pending || 0}</strong>
              </div>

              <div
                onClick={() => handleQuickStatusFilter('success')}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors border-b border-dark-border/50 ${
                  statusFilter === 'success'
                    ? 'bg-primary/15 border border-primary/40'
                    : 'hover:bg-dark-card/60'
                }`}
                title="Filter by Completed"
              >
                <span className="text-primary flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#00FF88]" />
                  Completed
                </span>
                <strong className="text-white">{statusCounts.success || 0}</strong>
              </div>

              <div
                onClick={() => handleQuickStatusFilter('new')}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
                  statusFilter === 'new'
                    ? 'bg-cyber-cyan/15 border border-cyber-cyan/40'
                    : 'hover:bg-dark-card/60'
                }`}
                title="Filter by New"
              >
                <span className="text-cyber-cyan flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyber-cyan shadow-[0_0_8px_#00F0FF]" />
                  New
                </span>
                <strong className="text-white">{statusCounts.new || 0}</strong>
              </div>
            </div>
          </aside>
        )}

        {/* Right Side: Graph Canvas & Inspector */}
        <section className={`${isSidebarOpen ? 'lg:col-span-3 xl:col-span-4' : 'col-span-full'} space-y-4`}>
          <div
            className={`p-4 sm:p-5 cyber-panel rounded-xl space-y-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] ${
              isFullscreen
                ? 'fixed inset-0 z-50 p-4 sm:p-6 bg-dark-bg/95 backdrop-blur-xl flex flex-col rounded-none'
                : ''
            }`}
          >
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                <span>GRAPH CANVAS</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyber-cyan px-2.5 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30">
                  {totalAssets} ENTITIES
                </span>
                <button
                  onClick={handleToggleFullscreen}
                  className="p-1 text-dark-muted hover:text-primary rounded border border-dark-border/60 hover:bg-dark-card/80 transition-colors"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-primary" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Canvas Filter & Search Toolbar with proper spacing */}
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
                className="w-36 sm:w-40 bg-dark-bg/90 border border-dark-border text-xs rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-primary font-mono cursor-pointer"
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

              <div className="flex items-center gap-2 pl-2 border-l border-dark-border/80">
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
                  className="w-28 sm:w-32 bg-dark-bg/90 border border-dark-border text-xs rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-primary font-mono"
                />
                <Button variant="secondary" size="sm" onClick={handleDepthFilter}>
                  Go
                </Button>
              </div>
            </div>

            {searchFeedback && (
              <p className="text-xs font-mono text-primary animate-fadeIn flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span>&gt; {searchFeedback}</span>
              </p>
            )}

            {/* Cytoscape Container with Cyber Background */}
            <div className={`relative border border-primary/25 rounded-xl overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.85)] ${isFullscreen ? 'flex-1 min-h-[400px]' : ''}`}>
              <div
                ref={containerRef}
                className={`w-full ${isFullscreen ? 'h-full min-h-[400px]' : 'h-[720px] lg:h-[780px] xl:h-[840px]'} cursor-grab active:cursor-grabbing`}
                style={{
                  backgroundColor: 'rgba(5, 10, 22, 0.85)',
                  backgroundImage:
                    'radial-gradient(rgba(0, 255, 136, 0.22) 1.5px, transparent 1.5px), radial-gradient(rgba(0, 240, 255, 0.08) 1px, transparent 1px)',
                  backgroundSize: '24px 24px, 48px 48px',
                }}
              />

              {/* Floating Canvas Controls (Zoom In, Zoom Out, Fit, Reset, Fullscreen) */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-dark-card/90 backdrop-blur-md border border-primary/30 p-1.5 rounded-lg shadow-xl font-mono z-10">
                <button
                  onClick={handleZoomIn}
                  title="Zoom In"
                  aria-label="Zoom In"
                  className="p-1.5 text-dark-muted hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  aria-label="Zoom Out"
                  className="p-1.5 text-dark-muted hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFit}
                  title="Fit to Canvas"
                  aria-label="Fit to Canvas"
                  className="p-1.5 text-dark-muted hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetLayout}
                  title="Re-align Tree Layout"
                  aria-label="Re-align Tree Layout"
                  className="p-1.5 text-dark-muted hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    isFullscreen
                      ? 'text-primary bg-primary/15 hover:bg-primary/25'
                      : 'text-dark-muted hover:text-primary hover:bg-primary/10'
                  }`}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>

              {/* Bottom Instructions Hint */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none font-mono">
                <span className="px-3.5 py-1 bg-dark-bg/90 backdrop-blur-md border border-primary/30 text-[10px] text-primary rounded-full shadow-[0_0_12px_rgba(0,255,136,0.2)]">
                  DRAG NODES TO REARRANGE • SCROLL TO ZOOM • CLICK NODE TO INSPECT
                </span>
              </div>
            </div>
          </div>

          {/* Selected Entity Inspector Panel (Only shown when an entity is selected; empty state removed) */}
          {selectedEntity && (
            <div className="p-4 sm:p-5 cyber-panel rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative cyber-corners border border-primary/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fadeIn">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-primary" />
                    <span>SELECTED ENTITY</span>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedEntity(null);
                      if (cyRef.current) {
                        cyRef.current.nodes().removeClass('selected-node');
                      }
                    }}
                    className="text-dark-muted hover:text-white p-1 rounded hover:bg-dark-border/40 transition-colors md:hidden"
                    title="Close inspector"
                    aria-label="Close inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-1">
                  <h3 className="text-lg sm:text-xl font-bold text-white neon-text-green font-mono tracking-tight flex items-center gap-2 truncate">
                    <span className="truncate">{selectedEntity.hostname}</span>
                    <button
                      onClick={() => handleCopyDomain(selectedEntity.hostname)}
                      className="text-dark-muted hover:text-primary p-1 transition-colors cursor-pointer shrink-0"
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
                  <p className="text-xs text-dark-muted font-mono mt-0.5 truncate">
                    {selectedEntity.isRoot
                      ? 'Root Domain in Scope'
                      : `Subdomain (Level ${selectedEntity.depth})`}
                    {selectedEntity.parent && (
                      <span className="text-cyber-cyan"> • Parent: {selectedEntity.parent}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-mono shrink-0">
                <div className="text-xs text-dark-text bg-dark-bg/80 px-3 py-1.5 rounded-lg border border-dark-border">
                  <span className="text-dark-muted">Direct:</span>{' '}
                  <strong className="text-primary">{selectedEntity.childrenCount}</strong>
                  {' • '}
                  <span className="text-dark-muted">Status:</span>{' '}
                  <span
                    className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] ${
                      selectedEntity.status === 'success'
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : selectedEntity.status === 'pending'
                        ? 'bg-warning/10 text-warning border border-warning/30'
                        : 'bg-dark-bg text-dark-muted border border-dark-border'
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
                    className="bg-dark-bg/90 border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-dark-text focus:outline-none focus:border-primary cursor-pointer font-mono"
                  >
                    <option value="new">Status: New</option>
                    <option value="pending">Status: Pending</option>
                    <option value="success">Status: Completed</option>
                  </select>

                  {!selectedEntity.isRoot && onHunt && (
                    <Button
                      variant="cyber"
                      size="sm"
                      onClick={() => onHunt(selectedEntity.hostname)}
                      leftIcon={<Crosshair className="w-3.5 h-3.5 text-cyber-cyan" />}
                    >
                      Hunt
                    </Button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedEntity(null);
                      if (cyRef.current) {
                        cyRef.current.nodes().removeClass('selected-node');
                      }
                    }}
                    className="hidden md:flex text-dark-muted hover:text-white p-1.5 rounded hover:bg-dark-border/40 transition-colors ml-1"
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
