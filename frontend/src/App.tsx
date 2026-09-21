import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ReactFlowProvider, NodeChange, EdgeChange, Connection, addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { TopBar } from './components/TopBar.js';
import { Palette } from './components/Palette.js';
import { Canvas } from './components/Canvas.js';
import { Properties } from './components/Properties.js';
import { YamlEditor } from './components/YamlEditor.js';
import { DiffModal } from './components/DiffModal.js';
import { SettingsDrawer } from './components/SettingsDrawer.js';
import { LeftSettingsDrawer } from './components/LeftSettingsDrawer.js';
import { ExecutionDrawer } from './components/ExecutionDrawer.js';
import { LoginScreen } from './components/LoginScreen.js';
import { ChangePasswordModal } from './components/ChangePasswordModal.js';
import { NotificationToast } from './components/NotificationToast.js';
import { layoutGraph } from './flow/layout.js';
import { yamlToGraph, graphToYaml } from './services/yamlSync.js';
import { validateWorkflowYaml, ValidationError, QuickFix, applyQuickFix } from './services/validator.js';
import { 
  fetchConnections, 
  saveConnectionApi, 
  deleteConnectionApi, 
  selectConnectionApi, 
  testConnectionApi,
  fetchWorkflows,
  fetchWorkflow,
  saveWorkflowApi,
  runWorkflowApi,
  fetchExecutionApi,
  fetchWorkflowExecutionsApi,
  cancelExecutionApi
} from './services/api.js';
import { 
  getStoredToken,
  getStoredUser, 
  loginApi, 
  logoutApi, 
  fetchCurrentUserApi
} from './services/auth.js';
import { useTheme } from './context/ThemeContext.js';
import { CustomNode, ClientConnectionSummary, WorkflowSummary, WorkflowNodeData, UserProfile, WorkflowExecutionDetail, WorkflowExecutionSummary } from './types.js';

export const App: React.FC = () => {
  // --- Auth & User State ---
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());
  const [authLoading, setAuthLoading] = useState(true);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const { isDarkTheme, toggleTheme } = useTheme();

  // --- Connections & Settings State ---
  const [connections, setConnections] = useState<ClientConnectionSummary[]>([]);
  const [activeConnId, setActiveConnId] = useState<string>('mock-env');
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);

  // --- Workflows State ---
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string>('');
  const [workflowName, setWorkflowName] = useState('Workflow');
  const [workflowEnabled, setWorkflowEnabled] = useState(true);

  // --- YAML & Canvas State ---
  const [yamlContent, setYamlContent] = useState('');
  const [originalYaml, setOriginalYaml] = useState('');
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // --- UI & Modal State ---
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Live Execution Monitoring State ---
  const [activeExecution, setActiveExecution] = useState<WorkflowExecutionDetail | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecutionSummary[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<'yaml' | 'execution'>('yaml');

  const canvasDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load: Auth Check
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      fetchCurrentUserApi().then(user => {
        setCurrentUser(user);
        setAuthLoading(false);
      }).catch(() => {
        setCurrentUser(null);
        setAuthLoading(false);
      });
    } else {
      setCurrentUser(null);
      setAuthLoading(false);
    }
  }, []);

  // 2. Initial Load: Connections & Workflows when logged in
  const loadConnections = useCallback(async () => {
    try {
      const data = await fetchConnections();
      setConnections(data.connections);
      setActiveConnId(data.activeConnection);
    } catch (err: any) {
      console.error('Failed to load connections:', err);
    }
  }, []);

  const loadWorkflows = useCallback(async () => {
    try {
      const list = await fetchWorkflows();
      setWorkflows(list);
      if (list.length > 0 && !currentWorkflowId) {
        selectWorkflowById(list[0].id);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to load workflows: ${err.message}` });
    }
  }, [currentWorkflowId]);

  useEffect(() => {
    if (currentUser) {
      loadConnections();
      loadWorkflows();
    }
  }, [currentUser, loadConnections, loadWorkflows]);

  // Auth Handlers
  const handleLogin = async (u: string, p: string) => {
    const res = await loginApi(u, p);
    setCurrentUser(res.user);
    setNotification({ type: 'success', message: `Signed in as ${res.user.fullName} (${res.user.role})` });
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
    setIsUserSettingsOpen(false);
    setIsPasswordModalOpen(false);
  };

  // Load execution history for a workflow
  const loadExecutionHistory = useCallback(async (wfId?: string) => {
    const id = wfId || currentWorkflowId;
    if (!id) return;
    try {
      const history = await fetchWorkflowExecutionsApi(id);
      setExecutionHistory(history);
    } catch (err: any) {
      console.error('Failed to load execution history:', err);
    }
  }, [currentWorkflowId]);

  // Select a workflow by ID
  const selectWorkflowById = async (id: string) => {
    try {
      const wf = await fetchWorkflow(id);
      setCurrentWorkflowId(wf.id);
      setWorkflowName(wf.name);
      setWorkflowEnabled(wf.enabled);
      setOriginalYaml(wf.yaml);
      setYamlContent(wf.yaml);

      // Reset active execution and fetch past executions
      setActiveExecution(null);
      loadExecutionHistory(wf.id);

      // Validate Workflow against Schema
      const valResult = validateWorkflowYaml(wf.yaml);
      setValidationErrors(valResult.errors);

      // Parse YAML to Graph & Auto Layout
      const parseRes = yamlToGraph(wf.yaml);
      parseRes.nodes.forEach(node => {
        const errs = valResult.errorsByStep.get(node.data.name);
        if (errs && errs.length > 0) {
          node.data.validationError = errs.join('; ');
        }
      });

      const layouted = layoutGraph(parseRes.nodes, parseRes.edges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setSelectedNodeId(null);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Error opening workflow: ${err.message}` });
    }
  };

  // --- Two-Way Synchronization ---

  // A. Triggered when YAML Editor changes (debounced by YamlEditor)
  const handleYamlChange = useCallback((newYaml: string) => {
    setYamlContent(newYaml);
    const valResult = validateWorkflowYaml(newYaml);
    setValidationErrors(valResult.errors);

    const parseRes = yamlToGraph(newYaml);
    if (!parseRes.error) {
      if (parseRes.workflowName) setWorkflowName(parseRes.workflowName);
      if (parseRes.workflowEnabled !== undefined) setWorkflowEnabled(parseRes.workflowEnabled);

      parseRes.nodes.forEach(node => {
        const errs = valResult.errorsByStep.get(node.data.name);
        if (errs && errs.length > 0) {
          node.data.validationError = errs.join('; ');
        }
      });

      const layouted = layoutGraph(parseRes.nodes, parseRes.edges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    }
  }, []);

  // B. Triggered when Canvas / Nodes change -> regenerates YAML
  const syncCanvasToYaml = useCallback((updatedNodes: CustomNode[], extraMeta?: any) => {
    if (canvasDebounceTimer.current) {
      clearTimeout(canvasDebounceTimer.current);
    }

    canvasDebounceTimer.current = setTimeout(() => {
      const newYaml = graphToYaml(yamlContent, updatedNodes, {
        name: extraMeta?.name ?? workflowName,
        enabled: extraMeta?.enabled ?? workflowEnabled
      });
      setYamlContent(newYaml);
      const valResult = validateWorkflowYaml(newYaml);
      setValidationErrors(valResult.errors);
    }, 250);
  }, [yamlContent, workflowName, workflowEnabled]);

  // React Flow Nodes Change
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds) as CustomNode[];
      // If position or data changed, sync
      const hasSignificantChange = changes.some(c => c.type === 'remove' || c.type === 'add');
      if (hasSignificantChange) {
        syncCanvasToYaml(updated);
      }
      return updated;
    });
  }, [syncCanvasToYaml]);

  // React Flow Edges Change
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // React Flow onConnect
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', style: { stroke: '#69707d', strokeWidth: 2 } }, eds));
    syncCanvasToYaml(nodes);
  }, [nodes, syncCanvasToYaml]);

  // Add Node from Palette Drop
  const onAddNodeFromPalette = useCallback((item: any, position: { x: number; y: number }) => {
    const timestamp = Date.now().toString().slice(-4);
    const stepName = item.category === 'trigger' 
      ? `trigger_${timestamp}` 
      : `${item.type.replace(/[^a-z0-9]+/gi, '_')}_${timestamp}`;

    let nodeType = 'stepNode';
    if (item.category === 'trigger') nodeType = 'triggerNode';
    else if (item.type === 'if') nodeType = 'ifNode';
    else if (item.type === 'foreach') nodeType = 'foreachNode';

    const newNode: CustomNode = {
      id: stepName,
      type: nodeType,
      position,
      data: {
        id: stepName,
        nodeCategory: item.category,
        name: stepName,
        type: item.type,
        description: item.description,
        with: item.defaultWith ? { ...item.defaultWith } : {},
        condition: item.condition,
        foreach: item.foreach
      }
    };

    setNodes((nds) => {
      const updated = [...nds, newNode];
      // Auto connect to last node if appropriate
      if (nds.length > 0 && item.category !== 'trigger') {
        const lastNode = nds[nds.length - 1];
        setEdges((eds) => [
          ...eds,
          {
            id: `edge-${lastNode.id}-${newNode.id}`,
            source: lastNode.id,
            target: newNode.id,
            type: 'smoothstep',
            style: { stroke: '#69707d', strokeWidth: 2 }
          }
        ]);
      }
      syncCanvasToYaml(updated);
      return updated;
    });

    setSelectedNodeId(newNode.id);
  }, [syncCanvasToYaml]);

  // Update Node from Properties panel
  const handleUpdateNode = useCallback((id: string, updatedData: Partial<WorkflowNodeData>) => {
    setNodes((nds) => {
      const updated = nds.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: { ...n.data, ...updatedData }
          };
        }
        return n;
      });
      syncCanvasToYaml(updated);
      return updated;
    });
  }, [syncCanvasToYaml]);

  // Delete Node
  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => {
      const updated = nds.filter((n) => n.id !== id);
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      syncCanvasToYaml(updated);
      return updated;
    });
    setSelectedNodeId(null);
  }, [syncCanvasToYaml]);

  // Auto Layout
  const handleAutoLayout = useCallback(() => {
    const layouted = layoutGraph(nodes, edges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [nodes, edges]);

  // Apply Quick Fix from Properties panel
  const handleApplyQuickFix = useCallback((fix: QuickFix) => {
    const updatedYaml = applyQuickFix(yamlContent, fix);
    handleYamlChange(updatedYaml);
    setNotification({
      type: 'success',
      message: `Quick fix applied: ${fix.title}`
    });
  }, [yamlContent, handleYamlChange]);

  // Save Workflow to Backend
  const handleSave = async () => {
    // Pre-flight Schema Validation Check
    const valResult = validateWorkflowYaml(yamlContent);
    if (!valResult.valid && valResult.errors.length > 0) {
      const topErrors = valResult.errors.slice(0, 3).map(e => `• ${e.message}`).join('\n');
      const extraCount = valResult.errors.length > 3 ? `\n... and ${valResult.errors.length - 3} more issue(s)` : '';
      const confirmSave = window.confirm(
        `⚠️ ${valResult.errors.length} schema validation issue(s) detected that may be rejected by Kibana:\n\n${topErrors}${extraCount}\n\nDo you still want to save?`
      );
      if (!confirmSave) {
        return;
      }
    }

    setIsSaving(true);
    setNotification(null);
    try {
      const currentWf = workflows.find(w => w.id === currentWorkflowId);
      const res = await saveWorkflowApi({
        id: currentWorkflowId || undefined,
        name: workflowName,
        enabled: workflowEnabled,
        yaml: yamlContent,
        expectedUpdatedAt: currentWf?.updatedAt
      });

      setOriginalYaml(res.yaml);
      setYamlContent(res.yaml);
      setCurrentWorkflowId(res.id);
      setNotification({ type: 'success', message: `Workflow saved successfully (${res.name})` });
      loadWorkflows();
    } catch (err: any) {
      setNotification({ type: 'error', message: `Save Error: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Reload current workflow
  const handleReload = () => {
    if (currentWorkflowId) {
      selectWorkflowById(currentWorkflowId);
    }
  };

  // New Workflow Templates
  const handleNewWorkflow = (templateKey: 'blank' | 'simple' | 'search' | 'flow') => {
    let tplYaml = '';
    const uniqueId = `wf-custom-${Date.now().toString().slice(-4)}`;

    if (templateKey === 'blank') {
      tplYaml = `name: New Workflow\nenabled: true\ntriggers:\n  - type: manual\nsteps: []\n`;
    } else if (templateKey === 'simple') {
      tplYaml = `name: Manual Logging\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: print_log\n    type: console\n    with:\n      message: "Workflow triggered successfully."\n`;
    } else if (templateKey === 'search') {
      tplYaml = `name: Elasticsearch Search and Alert\nenabled: true\ntriggers:\n  - type: alert\nsteps:\n  - name: search_ip\n    type: elasticsearch.search\n    with:\n      index: "kibana-sample-data-logs"\n      size: 5\n  - name: send_notice\n    type: console\n    with:\n      message: "Total records found: {{ steps.search_ip.output.hits.total.value }}"\n`;
    } else {
      tplYaml = `name: Conditional Flow and Loop\nenabled: true\ntriggers:\n  - type: scheduled\n    with:\n      every: "1h"\nsteps:\n  - name: check_condition\n    type: if\n    condition: "event.severity >= 50"\n    steps:\n      - name: loop_items\n        type: foreach\n        foreach: "\${{ event.alerts }}"\n        steps:\n          - name: log_item\n            type: console\n            with:\n              message: "Critical alert processed: {{ foreach.item._id }}"\n`;
    }

    setCurrentWorkflowId(uniqueId);
    setWorkflowName(`New Workflow (${templateKey})`);
    setWorkflowEnabled(true);
    setOriginalYaml(tplYaml);
    setYamlContent(tplYaml);

    const parseRes = yamlToGraph(tplYaml);
    const layouted = layoutGraph(parseRes.nodes, parseRes.edges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setSelectedNodeId(null);
    setActiveExecution(null);
    setExecutionHistory([]);
  };

  // Download YAML
  const handleDownloadYaml = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'workflow'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Live Execution Actions & Polling ---
  const handleTriggerRun = async () => {
    if (!currentWorkflowId) {
      setNotification({ type: 'error', message: 'Please select or save a workflow before running.' });
      return;
    }

    try {
      setIsRunning(true);
      setActiveBottomTab('execution');
      setNotification({ type: 'success', message: 'Starting live workflow execution test...' });

      // Clear previous execution statuses from nodes
      setNodes(nds => nds.map(n => ({
        ...n,
        data: {
          ...n.data,
          executionStatus: undefined,
          executionTimeMs: undefined,
          executionOutput: undefined,
          executionError: undefined
        }
      })));

      const runRes = await runWorkflowApi({
        workflowId: currentWorkflowId,
        workflowYaml: yamlContent
      });

      setActiveExecution({
        id: runRes.executionId,
        workflowId: currentWorkflowId,
        status: 'running',
        startedAt: new Date().toISOString(),
        stepExecutions: []
      });
    } catch (err: any) {
      setIsRunning(false);
      setNotification({ type: 'error', message: `Execution failed to start: ${err.message}` });
    }
  };

  const handleCancelRun = async () => {
    if (!activeExecution?.id) return;
    try {
      await cancelExecutionApi(activeExecution.id);
      setIsRunning(false);
      setActiveExecution(prev => prev ? { ...prev, status: 'cancelled' } : null);
      setNotification({ type: 'success', message: 'Workflow execution cancelled.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: `Cancel error: ${err.message}` });
    }
  };

  const selectExecutionById = async (execId: string) => {
    try {
      const detail = await fetchExecutionApi(execId);
      setActiveExecution(detail);

      // Reflect selected run onto canvas nodes
      setNodes(nds => nds.map(node => {
        const stepExec = detail.stepExecutions.find(s => s.stepId === node.data.name);
        if (stepExec) {
          return {
            ...node,
            data: {
              ...node.data,
              executionStatus: stepExec.status,
              executionTimeMs: stepExec.executionTimeMs,
              executionOutput: stepExec.state,
              executionError: stepExec.error
            }
          };
        }
        return node;
      }));
    } catch (err: any) {
      setNotification({ type: 'error', message: `Could not load execution detail: ${err.message}` });
    }
  };

  // Poll active execution every 800ms
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && activeExecution?.id) {
      interval = setInterval(async () => {
        try {
          const detail = await fetchExecutionApi(activeExecution.id);
          setActiveExecution(detail);

          // Update canvas nodes with latest step execution states
          setNodes(nds => nds.map(node => {
            const stepExec = detail.stepExecutions.find(s => s.stepId === node.data.name);
            if (stepExec) {
              return {
                ...node,
                data: {
                  ...node.data,
                  executionStatus: stepExec.status,
                  executionTimeMs: stepExec.executionTimeMs,
                  executionOutput: stepExec.state,
                  executionError: stepExec.error
                }
              };
            }
            return node;
          }));

          if (detail.status === 'completed' || detail.status === 'failed' || detail.status === 'cancelled') {
            setIsRunning(false);
            loadExecutionHistory();
            if (detail.status === 'completed') {
              setNotification({ 
                type: 'success', 
                message: `Workflow completed successfully (${detail.duration ? `${(detail.duration / 1000).toFixed(1)}s` : 'Done'})` 
              });
            } else if (detail.status === 'failed') {
              setNotification({ 
                type: 'error', 
                message: 'Workflow execution failed. Inspect step outputs for details.' 
              });
            }
          }
        } catch (err: any) {
          console.error('Execution poll error:', err);
        }
      }, 800);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, activeExecution?.id, loadExecutionHistory]);

  // Keyboard Shortcuts (Ctrl+S, Ctrl+D)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleAutoLayout();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
  const isDirty = yamlContent.trim() !== originalYaml.trim();
  const activeConnection = connections.find(c => c.id === activeConnId) || null;

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#121316] flex items-center justify-center text-[#00bfb3]">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 border-2 border-[#00bfb3] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-neutral-400">Initializing Panoptext.Visualiser...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <ReactFlowProvider>
      <div className={`flex flex-col h-screen w-screen transition-colors duration-200 ${isDarkTheme ? 'bg-[#121316] text-[#e1e2e6]' : 'bg-[#f8fafc] text-[#0f172a]'} overflow-hidden`}>
        {/* Top Bar */}
        <TopBar
          workflows={workflows}
          currentWorkflowId={currentWorkflowId}
          workflowName={workflowName}
          workflowEnabled={workflowEnabled}
          isDirty={isDirty}
          isSaving={isSaving}
          validationErrorsCount={validationErrors.length}
          activeConnection={activeConnection}
          currentUser={currentUser}
          isRunning={isRunning}
          isExecutionDrawerOpen={activeBottomTab === 'execution'}
          onTriggerRun={handleTriggerRun}
          onCancelRun={handleCancelRun}
          onToggleExecutionDrawer={() => setActiveBottomTab(t => t === 'execution' ? 'yaml' : 'execution')}
          onOpenUserSettings={() => setIsUserSettingsOpen(true)}
          onOpenConnections={() => setIsConnectionsOpen(true)}
          onSelectWorkflow={selectWorkflowById}
          onNameChange={(name) => {
            setWorkflowName(name);
            syncCanvasToYaml(nodes, { name });
          }}
          onToggleEnabled={() => {
            const next = !workflowEnabled;
            setWorkflowEnabled(next);
            syncCanvasToYaml(nodes, { enabled: next });
          }}
          onAutoLayout={handleAutoLayout}
          onOpenDiff={() => setIsDiffOpen(true)}
          onSave={handleSave}
          onReload={handleReload}
          onNewWorkflow={handleNewWorkflow}
          onDownloadYaml={handleDownloadYaml}
          onLogout={handleLogout}
          onChangePassword={() => setIsPasswordModalOpen(true)}
          isDarkTheme={isDarkTheme}
          onToggleTheme={toggleTheme}
        />

        {/* Floating Auto-Dismiss Toast with Copy & Text Selection */}
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
        />

        {/* Main Workspace: 3 Panels */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left: Palette */}
          <Palette />

          {/* Center: React Flow Canvas */}
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeSelect={(node) => setSelectedNodeId(node ? node.id : null)}
            onAddNodeFromPalette={onAddNodeFromPalette}
          />

          {/* Right: Properties */}
          <Properties
            selectedNode={selectedNode}
            nodes={nodes}
            edges={edges}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            workflowMeta={{
              name: workflowName,
              enabled: workflowEnabled
            }}
            validationErrors={validationErrors}
            onApplyQuickFix={handleApplyQuickFix}
          />
        </div>

        {/* Bottom Panel: YAML Editor or Live Execution Monitor */}
        {activeBottomTab === 'yaml' ? (
          <YamlEditor
            value={yamlContent}
            onChange={handleYamlChange}
            onSwitchToExecution={() => setActiveBottomTab('execution')}
            isRunning={isRunning}
          />
        ) : (
          <ExecutionDrawer
            currentWorkflowId={currentWorkflowId}
            workflowName={workflowName}
            activeExecution={activeExecution}
            isRunning={isRunning}
            onTriggerRun={handleTriggerRun}
            onCancelRun={handleCancelRun}
            onSelectExecution={selectExecutionById}
            executionHistory={executionHistory}
            onRefreshHistory={() => loadExecutionHistory()}
            onSelectStepNode={(stepName) => setSelectedNodeId(stepName)}
            onSwitchToYaml={() => setActiveBottomTab('yaml')}
          />
        )}

        {/* Cluster Inventory & Integrations Drawer (Opened via Connection Pill) */}
        <SettingsDrawer
          isOpen={isConnectionsOpen}
          onClose={() => setIsConnectionsOpen(false)}
          connections={connections}
          activeConnectionId={activeConnId}
          onSelectConnection={async (id) => {
            await selectConnectionApi(id);
            setActiveConnId(id);
            await loadConnections();
            await loadWorkflows();
          }}
          onSaveConnection={async (conn) => {
            await saveConnectionApi(conn);
            await loadConnections();
          }}
          onDeleteConnection={async (id) => {
            await deleteConnectionApi(id);
            await loadConnections();
          }}
          onTestConnection={async (connData) => {
            return await testConnectionApi(connData);
          }}
        />

        {/* Left Settings & User Management Drawer (Opened via Hamburger Menu) */}
        <LeftSettingsDrawer
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
          currentUserId={currentUser.id}
        />

        {/* Change Password Modal (Opened via Top-Right User Menu) */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          username={currentUser.username}
        />

        {/* Diff Preview Modal */}
        <DiffModal
          isOpen={isDiffOpen}
          onClose={() => setIsDiffOpen(false)}
          originalYaml={originalYaml}
          currentYaml={yamlContent}
          onConfirmSave={handleSave}
        />
      </div>
    </ReactFlowProvider>
  );
};

export default App;
