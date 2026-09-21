import React, { useState } from 'react';
import { 
  Play, Clock, Bell, Zap, 
  Terminal, Search, Database, Globe, 
  GitBranch, Repeat, Hourglass, Bot, 
  Search as SearchIcon, ChevronDown, ChevronRight, GripVertical
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface PaletteItem {
  id: string;
  category: 'trigger' | 'step' | 'flow-control';
  name: string;
  type: string;
  description: string;
  icon: React.ReactNode;
  defaultWith?: Record<string, any>;
  condition?: string;
  foreach?: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Triggers
  {
    id: 'tr-manual',
    category: 'trigger',
    name: 'Manual Trigger',
    type: 'manual',
    description: 'Triggered on-demand via UI or API.',
    icon: <Play size={14} className="text-[#00bfb3]" />
  },
  {
    id: 'tr-scheduled',
    category: 'trigger',
    name: 'Scheduled Trigger',
    type: 'scheduled',
    description: 'Runs on fixed intervals or cron schedules.',
    icon: <Clock size={14} className="text-[#fec514]" />,
    defaultWith: { every: '15m' }
  },
  {
    id: 'tr-alert',
    category: 'trigger',
    name: 'Alert Trigger',
    type: 'alert',
    description: 'Executes automatically when an alert triggers.',
    icon: <Bell size={14} className="text-[#f04e98]" />
  },
  {
    id: 'tr-event',
    category: 'trigger',
    name: 'Event Trigger',
    type: 'event',
    description: 'Triggered from external webhooks or event streams.',
    icon: <Zap size={14} className="text-[#00bfb3]" />
  },

  // Flow Control
  {
    id: 'fc-if',
    category: 'flow-control',
    name: 'Conditional Branch (if)',
    type: 'if',
    description: 'Branches execution based on a KQL or boolean expression.',
    icon: <GitBranch size={14} className="text-[#fec514]" />,
    condition: 'event.alerts[0].kibana.alert.risk_score >= 70'
  },
  {
    id: 'fc-foreach',
    category: 'flow-control',
    name: 'Loop (foreach)',
    type: 'foreach',
    description: 'Iterates sequentially over items in a list.',
    icon: <Repeat size={14} className="text-[#3274d9]" />,
    foreach: '${{ event.alerts }}'
  },
  {
    id: 'fc-wait',
    category: 'flow-control',
    name: 'Wait',
    type: 'wait',
    description: 'Pauses workflow execution for a duration.',
    icon: <Hourglass size={14} className="text-amber-400" />,
    defaultWith: { duration: '10s' }
  },

  // Elasticsearch
  {
    id: 'es-search',
    category: 'step',
    name: 'Elasticsearch Search',
    type: 'elasticsearch.search',
    description: 'Executes search queries on indices or data streams.',
    icon: <Search size={14} className="text-[#0077cc]" />,
    defaultWith: { index: 'logs-*', query: { match_all: {} }, size: 10 }
  },
  {
    id: 'es-index',
    category: 'step',
    name: 'Elasticsearch Index',
    type: 'elasticsearch.index',
    description: 'Indexes a new document into an index.',
    icon: <Database size={14} className="text-[#0077cc]" />,
    defaultWith: { index: 'audit-logs', document: { status: 'OK' } }
  },
  {
    id: 'es-update',
    category: 'step',
    name: 'Elasticsearch Update',
    type: 'elasticsearch.update',
    description: 'Updates an existing document.',
    icon: <Database size={14} className="text-[#0077cc]" />,
    defaultWith: { index: 'audit-logs', id: 'doc-1', doc: { updated: true } }
  },
  {
    id: 'es-esql',
    category: 'step',
    name: 'ES|QL Query',
    type: 'elasticsearch.esql.query',
    description: 'Executes an ES|QL analytical query pipeline.',
    icon: <Search size={14} className="text-[#0077cc]" />,
    defaultWith: { query: 'FROM logs-* | LIMIT 10' }
  },
  {
    id: 'es-request',
    category: 'step',
    name: 'ES REST Request',
    type: 'elasticsearch.request',
    description: 'Generic escape hatch for any Elasticsearch REST API call.',
    icon: <Database size={14} className="text-[#0077cc]" />,
    defaultWith: { method: 'GET', path: '/_cluster/health' }
  },

  // Kibana & Actions
  {
    id: 'act-console',
    category: 'step',
    name: 'Console Log',
    type: 'console',
    description: 'Logs message to workflow execution output.',
    icon: <Terminal size={14} className="text-[#00bfb3]" />,
    defaultWith: { message: 'Workflow step finished.' }
  },
  {
    id: 'kb-alerts-status',
    category: 'step',
    name: 'Kibana Set Alerts Status',
    type: 'kibana.SetAlertsStatus',
    description: 'Updates security alert status (open, ack, closed).',
    icon: <Zap size={14} className="text-[#f04e98]" />,
    defaultWith: { alerts: ['{{ event.alerts[0]._id }}'], status: 'acknowledged' }
  },
  {
    id: 'act-http',
    category: 'step',
    name: 'HTTP Request',
    type: 'http.request',
    description: 'Calls external webhook or third-party REST API.',
    icon: <Globe size={14} className="text-[#00a9e0]" />,
    defaultWith: { method: 'POST', url: 'https://example.com/api', headers: { 'Content-Type': 'application/json' } }
  },

  // AI Steps
  {
    id: 'ai-prompt',
    category: 'step',
    name: 'AI Prompt',
    type: 'ai.prompt',
    description: 'Sends a prompt to a GenAI model connector.',
    icon: <Bot size={14} className="text-[#9353d3]" />,
    defaultWith: { prompt: 'Analyze this log entry: {{ steps.search.output }}' }
  },
  {
    id: 'ai-classify',
    category: 'step',
    name: 'AI Classify',
    type: 'ai.classify',
    description: 'Classifies input text into a set of categories.',
    icon: <Bot size={14} className="text-[#9353d3]" />,
    defaultWith: { input: '{{ event.alerts[0].message }}', categories: ['security', 'performance', 'info'] }
  }
];

export const Palette: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const onDragStart = (event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredItems = PALETTE_ITEMS.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [
    { id: 'trigger', title: 'Triggers' },
    { id: 'flow-control', title: 'Flow Control' },
    { id: 'step', title: 'Action Steps' }
  ];

  const { isDarkTheme } = useTheme();

  return (
    <div className={`w-64 border-r flex flex-col h-full select-none transition-colors duration-200 ${
      isDarkTheme ? 'bg-[#18191f] border-[#2d3139]' : 'bg-slate-50 border-slate-200'
    }`}>
      {/* Search Header */}
      <div className={`p-3 border-b ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
        <div className={`text-xs font-bold mb-2 uppercase tracking-wider flex items-center justify-between ${
          isDarkTheme ? 'text-neutral-300' : 'text-slate-700'
        }`}>
          <span>Node Palette</span>
          <span className={`text-[10px] font-normal ${isDarkTheme ? 'text-neutral-500' : 'text-slate-400'}`}>
            Drag & Drop
          </span>
        </div>
        <div className="relative">
          <SearchIcon size={14} className={`absolute left-2.5 top-2.5 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Search step or trigger..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full text-xs pl-8 pr-2 py-1.5 rounded border focus:outline-none focus:border-[#00bfb3] transition-colors ${
              isDarkTheme 
                ? 'bg-[#121315] text-neutral-200 border-[#2d3139] placeholder-neutral-500' 
                : 'bg-white text-slate-900 border-slate-300 placeholder-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categories.map(cat => {
          const itemsInCat = filteredItems.filter(i => i.category === cat.id);
          if (itemsInCat.length === 0) return null;

          const isCollapsed = collapsedCategories[cat.id];

          return (
            <div key={cat.id} className="space-y-1">
              <button
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold transition-colors uppercase tracking-wider ${
                  isDarkTheme ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{cat.title} ({itemsInCat.length})</span>
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>

              {!isCollapsed && (
                <div className="space-y-1">
                  {itemsInCat.map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, item)}
                      className={`p-2 rounded border cursor-grab active:cursor-grabbing transition-all flex items-start gap-2 shadow-xs group ${
                        isDarkTheme
                          ? 'bg-[#20222a] border-[#2d3139] hover:border-[#00bfb3]/60 hover:bg-[#252833]'
                          : 'bg-white border-slate-200 hover:border-[#00bfb3] hover:bg-slate-50'
                      }`}
                      title={item.description}
                    >
                      <GripVertical size={14} className={`mt-0.5 shrink-0 ${
                        isDarkTheme ? 'text-neutral-600 group-hover:text-neutral-400' : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                      <div className="mt-0.5 shrink-0">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate transition-colors ${
                          isDarkTheme ? 'text-neutral-200 group-hover:text-[#00bfb3]' : 'text-slate-800 group-hover:text-[#009b91]'
                        }`}>
                          {item.name}
                        </div>
                        <div className={`text-[10px] font-mono truncate ${
                          isDarkTheme ? 'text-neutral-500' : 'text-slate-500'
                        }`}>{item.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
