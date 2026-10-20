import { MCP_TOOL_CATALOG } from '@/lib/mcp/catalog';
import { render, screen } from '@testing-library/react';
import type { TocSection } from '@/components/ui/table-of-contents';
import { renderInPlatform } from '@/test/platform';
import { architectureViews } from './architecture';
import { dbModels, dbRelations } from './db-schema';
import Loading from './loading';
import DesarrolloPage, { metadata } from './page';
import { techNoteGroups } from './tech-notes';

// The heavy children (Mermaid diagrams, GitHub stats, highlighted code) have their own tests;
// here they are stubs that expose what the page hands them.
jest.mock('@/components/desarrollo/desarrollo-toc', () => ({
  DesarrolloToc: ({ sections }: { sections: TocSection[] }) => (
    <ol aria-label="índice">
      {sections.map((section) => (
        <li key={section.id} data-group={section.group ?? ''}>
          {section.id}
        </li>
      ))}
    </ol>
  ),
}));
jest.mock('@/components/desarrollo/architecture-diagram', () => ({
  ArchitectureDiagram: ({ id }: { id: string }) => <div data-testid={`diagram-${id}`} />,
}));
jest.mock('@/components/desarrollo/db-diagram', () => ({
  DbDiagram: ({ models, relations }: { models: unknown[]; relations: unknown[] }) => (
    <div data-testid="db-diagram">
      {models.length} models · {relations.length} relations
    </div>
  ),
}));
jest.mock('@/components/desarrollo/tech-notes', () => ({
  TechNotes: ({ groups }: { groups: unknown[] }) => (
    <div data-testid="tech-notes">{groups.length} groups</div>
  ),
}));
jest.mock('@/components/desarrollo/collaboration-stats', () => ({
  CollaborationStats: () => <div data-testid="collaboration-stats" />,
  CollaborationStatsSkeleton: () => null,
}));
jest.mock('@/lib/identity-links', () => ({ getIdentityMap: jest.fn(async () => ({})) }));
jest.mock('@/components/landing/team', () => ({
  Team: () => <div data-testid="team" />,
  teamSize: 7,
}));
const noteCount = techNoteGroups.reduce((total, group) => total + group.notes.length, 0);

describe('DesarrolloPage', () => {
  it('has human-readable SEO metadata pointing at /desarrollo', () => {
    expect(metadata.title).toBe('pnpm dev');
    expect(metadata.openGraph).toMatchObject({
      title: 'Desarrollá el proyecto | programaConNosotros',
      url: expect.stringMatching(/\/desarrollo$/),
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('links to the repo, the dev chat, the design system and the quality pages', () => {
    renderInPlatform(<DesarrolloPage />);
    const repo = 'https://github.com/programaconnosotros/pcn-os';
    expect(screen.getByRole('link', { name: /abrirGitHub/ })).toHaveAttribute('href', repo);
    expect(screen.getByRole('link', { name: /irAlRepositorio/ })).toHaveAttribute('href', repo);
    expect(screen.getByRole('link', { name: /unirseAlGrupo/ })).toHaveAttribute(
      'href',
      expect.stringContaining('chat.whatsapp.com'),
    );
    expect(screen.getByRole('link', { name: '~/desarrollo/diseno →' })).toHaveAttribute(
      'href',
      '/desarrollo/diseno',
    );
    expect(screen.getByRole('link', { name: '~/desarrollo/calidad →' })).toHaveAttribute(
      'href',
      '/desarrollo/calidad',
    );
  });

  it('indexes every section, diagram and stack note', () => {
    renderInPlatform(<DesarrolloPage />);
    const ids = Array.from(
      screen.getByRole('list', { name: 'índice' }).querySelectorAll('li'),
      (li) => li.textContent,
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        'arquitectura',
        'decisiones',
        'base-de-datos',
        'mcp',
        'team',
        'por-que-contribuir',
      ]),
    );
    for (const view of architectureViews) {
      expect(ids).toContain(`diagrama-${view.id}`);
      expect(screen.getByTestId(`diagram-${view.id}`)).toBeInTheDocument();
    }
    for (const group of techNoteGroups) {
      for (const note of group.notes) expect(ids).toContain(`nota-${note.id}`);
    }
    expect(ids).toHaveLength(15 + architectureViews.length + noteCount);
  });

  it('lists every MCP tool, marking the writes', () => {
    renderInPlatform(<DesarrolloPage />);
    const section = document.getElementById('mcp')!;
    expect(section).toHaveTextContent(`Servidor MCP (${MCP_TOOL_CATALOG.length} tools)`);
    for (const tool of MCP_TOOL_CATALOG) expect(section).toHaveTextContent(tool.name);
    expect(section).toHaveTextContent('delete_announcementrm');
  });

  it('describes the database from the generated schema', () => {
    renderInPlatform(<DesarrolloPage />);
    expect(
      screen.getByText(new RegExp(`${dbModels.length} modelos y ${dbRelations.length} relaciones`)),
    ).toBeInTheDocument();
    expect(screen.getByTestId('db-diagram')).toHaveTextContent(
      `${dbModels.length} models · ${dbRelations.length} relations`,
    );
    const toUser = dbRelations.filter((relation) => relation.to === 'User').length;
    expect(
      screen.getByText(new RegExp(`${toUser} de las ${dbRelations.length} relaciones`)),
    ).toBeInTheDocument();
    // Event registrations are a many-to-many join table (event + user unique).
    expect(screen.getByText(/Las relaciones muchos a muchos/)).toHaveTextContent(
      'EventRegistration',
    );
  });

  it('counts the stack notes and shows the stats and the team', () => {
    renderInPlatform(<DesarrolloPage />);
    expect(
      screen.getByRole('heading', { name: `## Notas teóricas del stack (${noteCount})` }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tech-notes')).toHaveTextContent(`${techNoteGroups.length} groups`);
    expect(screen.getByRole('heading', { name: '## Team de desarrollo (7)' })).toBeInTheDocument();
    expect(screen.getByTestId('collaboration-stats')).toBeInTheDocument();
    expect(screen.getByTestId('team')).toBeInTheDocument();
  });
});

describe('desarrollo loading', () => {
  it('shows a prose skeleton while loading', () => {
    const { container } = render(<Loading />);
    expect(container.firstChild).not.toBeEmptyDOMElement();
  });
});
