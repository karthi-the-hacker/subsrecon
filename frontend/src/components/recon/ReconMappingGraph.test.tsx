import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReconMappingGraph } from './ReconMappingGraph';
import { ReconDetail } from '@/types/api';

const mockRecon: ReconDetail = {
  id: '84eb46fd-e064-4525-92fe-855c57c0ad60',
  name: '1wtoken.com',
  reportTo: 'test@1wtoken.com',
  domains: ['1wtoken.com'],
  database: '84eb46fd-e064-4525-92fe-855c57c0ad60.json',
  status: 'completed',
  domainCount: 1,
  subdomainCount: 4,
  createdAt: '2026-11-02T11:35:32.172Z',
  lastUsedAt: '2026-11-02T11:45:24.332Z',
  completedAt: '2026-11-02T11:35:51.655Z',
  scan: {
    startedAt: '2026-11-02T11:35:32.223Z',
    completedAt: '2026-11-02T11:35:51.655Z',
    errors: [],
  },
  subdomains: [
    {
      hostname: 'inst.1wtoken.com',
      rootDomain: '1wtoken.com',
      parent: null,
      depth: null,
      source: 'enumeration',
      firstSeenAt: '2026-11-02T11:35:51.669Z',
      lastSeenAt: '2026-11-02T11:35:51.669Z',
    },
    {
      hostname: 'inst1.1wtoken.com',
      rootDomain: '1wtoken.com',
      parent: null,
      depth: null,
      source: 'enumeration',
      firstSeenAt: '2026-11-02T11:35:51.669Z',
      lastSeenAt: '2026-11-02T11:35:51.669Z',
    },
    {
      hostname: 'www.1wtoken.com',
      rootDomain: '1wtoken.com',
      parent: null,
      depth: null,
      source: 'enumeration',
      firstSeenAt: '2026-11-02T11:35:51.669Z',
      lastSeenAt: '2026-11-02T11:35:51.669Z',
    },
    {
      hostname: 'www.inst.1wtoken.com',
      rootDomain: '1wtoken.com',
      parent: null,
      depth: null,
      source: 'enumeration',
      firstSeenAt: '2026-11-02T11:35:51.669Z',
      lastSeenAt: '2026-11-02T11:35:51.669Z',
    },
  ],
  relationships: [
    { parent: '1wtoken.com', child: 'inst.1wtoken.com', type: 'subdomain' },
    { parent: '1wtoken.com', child: 'inst1.1wtoken.com', type: 'subdomain' },
    { parent: '1wtoken.com', child: 'www.1wtoken.com', type: 'subdomain' },
    { parent: 'inst.1wtoken.com', child: 'www.inst.1wtoken.com', type: 'subdomain' },
  ],
  domainStatuses: {
    'inst.1wtoken.com': 'pending',
  },
};

describe('ReconMappingGraph Component', () => {
  it('renders target intelligence, attack surface overview and graph canvas header', () => {
    render(<ReconMappingGraph recon={mockRecon} />);

    expect(screen.getByText('Subs Graph')).toBeInTheDocument();
    expect(screen.getByText('EXPORT JSON ↗')).toBeInTheDocument();
    expect(screen.getByText('01 / TARGET INTELLIGENCE')).toBeInTheDocument();
    expect(screen.getByText('ATTACK SURFACE OVERVIEW')).toBeInTheDocument();
    expect(screen.getByText('GRAPH CANVAS')).toBeInTheDocument();
  });

  it('displays accurate attack surface summary statistics', () => {
    render(<ReconMappingGraph recon={mockRecon} />);

    expect(screen.getByText('Root domains')).toBeInTheDocument();
    expect(screen.getByText('Total subdomains')).toBeInTheDocument();
    expect(screen.getByText('Total assets')).toBeInTheDocument();
    expect(screen.getByText('Maximum depth')).toBeInTheDocument();
  });

  it('handles Export JSON button click and generates file download', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(<ReconMappingGraph recon={mockRecon} />);

    const exportBtn = screen.getByText('EXPORT JSON ↗');
    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('allows searching domain in graph and updating search filter', () => {
    render(<ReconMappingGraph recon={mockRecon} />);

    const input = screen.getByPlaceholderText('Search domain, e.g. hack.cappriciosec.com');
    fireEvent.change(input, { target: { value: 'inst' } });

    const searchBtn = screen.getByRole('button', { name: /^Search$/i });
    fireEvent.click(searchBtn);

    const clearBtn = screen.getByRole('button', { name: /^Clear$/i });
    fireEvent.click(clearBtn);
    expect(input).toHaveValue('');
  });

  it('correctly splits subdomains: leaves on left, subdomains with children on right, and descendants further right', () => {
    // Intercept blob creation to inspect exported tree data
    let exportedData: any = null;
    window.Blob = class MockBlob {
      constructor(content: string[]) {
        exportedData = JSON.parse(content[0] || '{}');
      }
    } as any;

    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.createObjectURL = createObjectURLMock;

    render(<ReconMappingGraph recon={mockRecon} />);

    const exportBtn = screen.getByText('EXPORT JSON ↗');
    fireEvent.click(exportBtn);

    expect(exportedData).toBeTruthy();
    expect(exportedData.attackSurfaceOverview.totalSubdomainsCount).toBe(4);
    expect(exportedData.attackSurfaceOverview.rootDomainsCount).toBe(1);

    const rootTree = exportedData.treeHierarchy[0];
    expect(rootTree.hostname).toBe('1wtoken.com');

    // Left children: leaves directly under root (no more subdomains)
    const leftHosts = rootTree.leftChildren.map((c: any) => c.hostname);
    expect(leftHosts).toContain('inst1.1wtoken.com');
    expect(leftHosts).toContain('www.1wtoken.com');
    expect(leftHosts).not.toContain('inst.1wtoken.com');

    // Right children: branch nodes directly under root (has more subdomains)
    const rightHosts = rootTree.rightChildren.map((c: any) => c.hostname);
    expect(rightHosts).toContain('inst.1wtoken.com');
    expect(rightHosts).not.toContain('inst1.1wtoken.com');
    expect(rightHosts).not.toContain('www.1wtoken.com');

    // Descendant of inst.1wtoken.com is further on the right
    const instNode = rootTree.rightChildren.find((c: any) => c.hostname === 'inst.1wtoken.com');
    expect(instNode.rightChildren.map((c: any) => c.hostname)).toContain('www.inst.1wtoken.com');

    // Verify cytoscape node coordinates:
    // Left nodes have negative x (left of center root at x = 0)
    // Right nodes have positive x (right of center root at x = 0)
    const nodes = exportedData.graphElements.nodes;
    const rootPos = nodes.find((n: any) => n.data.hostname === '1wtoken.com').position;
    const inst1Pos = nodes.find((n: any) => n.data.hostname === 'inst1.1wtoken.com').position;
    const wwwPos = nodes.find((n: any) => n.data.hostname === 'www.1wtoken.com').position;
    const instPos = nodes.find((n: any) => n.data.hostname === 'inst.1wtoken.com').position;
    const wwwInstPos = nodes.find((n: any) => n.data.hostname === 'www.inst.1wtoken.com').position;

    expect(rootPos.x).toBe(0);
    // Left children: x < rootPos.x
    expect(inst1Pos.x).toBeLessThan(rootPos.x);
    expect(wwwPos.x).toBeLessThan(rootPos.x);

    // Right children: x > rootPos.x
    expect(instPos.x).toBeGreaterThan(rootPos.x);

    // Descendants on right branch: x > parent.x
    expect(wwwInstPos.x).toBeGreaterThan(instPos.x);
  });

  it('does not render "Select a node" empty placeholder when no entity is selected', () => {
    render(<ReconMappingGraph recon={mockRecon} />);

    expect(screen.queryByText(/Select a node/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Click any node in the graph canvas to inspect its direct subdomains and triage actions/i)
    ).not.toBeInTheDocument();
  });

  it('supports collapsing and expanding the Target Intelligence sidebar', () => {
    render(<ReconMappingGraph recon={mockRecon} />);

    const toggleBtn = screen.getByLabelText(/Collapse Target Intel/i);
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText('01 / TARGET INTELLIGENCE')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleBtn);
    expect(screen.queryByText('01 / TARGET INTELLIGENCE')).not.toBeInTheDocument();

    // Click to expand back
    const expandBtn = screen.getByLabelText(/Expand Target Intel/i);
    fireEvent.click(expandBtn);
    expect(screen.getByText('01 / TARGET INTELLIGENCE')).toBeInTheDocument();
  });

  it('supports toggling fullscreen canvas mode', () => {
    render(<ReconMappingGraph recon={mockRecon} />);

    const fullscreenBtns = screen.getAllByLabelText(/Fullscreen Canvas/i);
    expect(fullscreenBtns.length).toBeGreaterThan(0);

    // Toggle fullscreen on
    fireEvent.click(fullscreenBtns[0]!);
    const exitBtns = screen.getAllByLabelText(/Exit Fullscreen/i);
    expect(exitBtns.length).toBeGreaterThan(0);

    // Toggle fullscreen off
    fireEvent.click(exitBtns[0]!);
    expect(screen.getAllByLabelText(/Fullscreen Canvas/i).length).toBeGreaterThan(0);
  });
});
