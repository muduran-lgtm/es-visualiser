import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode } from '../flow/nodes/TriggerNode.js';
import { StepNode } from '../flow/nodes/StepNode.js';
import { IfNode } from '../flow/nodes/IfNode.js';
import { ForeachNode } from '../flow/nodes/ForeachNode.js';
import { GenericNode } from '../flow/nodes/GenericNode.js';
import { CustomNode } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';

interface CanvasProps {
  nodes: CustomNode[];
  edges: any[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeSelect: (node: CustomNode | null) => void;
  onAddNodeFromPalette: (item: any, position: { x: number; y: number }) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onAddNodeFromPalette
}) => {
  const { isDarkTheme } = useTheme();
  const reactFlowInstance = useReactFlow();

  const nodeTypes = useMemo(() => ({
    triggerNode: TriggerNode,
    stepNode: StepNode,
    ifNode: IfNode,
    foreachNode: ForeachNode,
    genericNode: GenericNode
  } as any), []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData('application/reactflow');
      if (!rawData) return;

      try {
        const item = JSON.parse(rawData);
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        });

        onAddNodeFromPalette(item, position);
      } catch (err) {
        console.error('Failed to parse dropped data:', err);
      }
    },
    [reactFlowInstance, onAddNodeFromPalette]
  );

  const onSelectionChange = useCallback((params: { nodes: CustomNode[] }) => {
    if (params.nodes && params.nodes.length > 0) {
      onNodeSelect(params.nodes[0]);
    } else {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  return (
    <div 
      className={`flex-1 h-full relative transition-colors duration-200 ${
        isDarkTheme ? 'bg-[#121316]' : 'bg-[#f8fafc]'
      }`} 
      onDragOver={onDragOver} 
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        colorMode={isDarkTheme ? 'dark' : 'light'}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onSelectionChange={onSelectionChange}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: isDarkTheme ? '#4b5362' : '#94a3b8', strokeWidth: 2 }
        }}
        className="touch-none"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color={isDarkTheme ? '#272a34' : '#cbd5e1'} 
        />
        <Controls 
          className="rounded-lg overflow-hidden shadow-md" 
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'triggerNode') return '#00bfb3';
            if (n.type === 'ifNode') return '#fec514';
            if (n.type === 'foreachNode') return '#3274d9';
            if (n.type === 'genericNode') return '#9353d3';
            return isDarkTheme ? '#4b5362' : '#94a3b8';
          }}
          className={`rounded-lg shadow-lg border ${
            isDarkTheme ? 'bg-[#181920] border-[#2d3139]' : 'bg-white border-slate-300'
          }`}
          maskColor={isDarkTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'}
        />
      </ReactFlow>
    </div>
  );
};
