import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction?: 'TB' | 'LR';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

/**
 * layoutGraph abstraction:
 * Computes graph layout using @dagrejs/dagre.
 * Abstracted interface allowing future migration to elkjs or alternative layout engines.
 */
export function layoutGraph<T extends Record<string, any>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node<T>[]; edges: Edge[] } {
  const {
    direction = 'TB',
    nodeWidth = 260,
    nodeHeight = 100,
    rankSep = 60,
    nodeSep = 50
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep
  });

  nodes.forEach((node) => {
    const width = node.measured?.width || (node as any).width || nodeWidth;
    const height = node.measured?.height || (node as any).height || nodeHeight;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.measured?.width || (node as any).width || nodeWidth;
    const height = node.measured?.height || (node as any).height || nodeHeight;

    return {
      ...node,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - width / 2 : node.position.x,
        y: nodeWithPosition ? nodeWithPosition.y - height / 2 : node.position.y
      }
    };
  });

  return { nodes: layoutedNodes, edges };
}
