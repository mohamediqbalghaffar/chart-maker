import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChartNode from './components/ChartNode';
import { Download, Edit3, Monitor, Tablet, Check, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_DATA = {
  id: 'root',
  name: 'Solar Farm Project',
  code: '1.0',
  children: [
    {
      id: '1.1',
      name: 'Site Investigation',
      code: '1.1',
      children: [
        { id: '1.1.1', name: 'Soil Analysis', code: '1.1.1', children: [] },
        { id: '1.1.2', name: 'Topographic Survey', code: '1.1.2', children: [] }
      ]
    },
    {
      id: '1.2',
      name: 'Design Phase',
      code: '1.2',
      children: [
        { id: '1.2.1', name: 'Electrical Layout', code: '1.2.1', children: [] },
        { id: '1.2.2', name: 'Structural Design', code: '1.2.2', children: [] }
      ]
    },
    {
      id: '1.3',
      name: 'Procurement',
      code: '1.3',
      children: [
        { id: '1.3.1', name: 'Solar Panels', code: '1.3.1', children: [] },
        { id: '1.3.2', name: 'Inverters', code: '1.3.2', children: [] }
      ]
    }
  ]
};

function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('wbs_data');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState('desktop');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('wbs_data', JSON.stringify(data));
  }, [data]);

  const updateNode = useCallback((id, updates) => {
    setData(prev => {
      const updateRecursive = (node) => {
        if (node.id === id) return { ...node, ...updates };
        if (!node.children) return node;
        return { ...node, children: node.children.map(child => updateRecursive(child)) };
      };
      return updateRecursive(prev);
    });
  }, []);

  const addChild = useCallback((parentId) => {
    setData(prev => {
      const addRecursive = (node) => {
        if (node.id === parentId) {
          const nextIndex = (node.children?.length || 0) + 1;
          const newCode = `${node.code}.${nextIndex}`;
          return {
            ...node,
            children: [...(node.children || []), {
              id: Math.random().toString(36).substr(2, 9),
              name: 'New Item',
              code: newCode,
              children: []
            }]
          };
        }
        if (!node.children) return node;
        return { ...node, children: node.children.map(child => addRecursive(child)) };
      };
      return addRecursive(prev);
    });
  }, []);

  const deleteNode = useCallback((id) => {
    setData(prev => {
      const deleteRecursive = (node) => {
        if (!node.children) return node;
        return {
          ...node,
          children: node.children
            .filter(child => child.id !== id)
            .map(child => deleteRecursive(child))
        };
      };
      return deleteRecursive(prev);
    });
  }, []);

  const handleDownload = async (format, options = {}) => {
    setIsDownloading(true);
    setShowDownloadMenu(false);

    try {
      const element = chartRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const title = data.name.replace(/\s+/g, '_');

      if (format === 'pdf') {
        const { orientation = 'p', unit = 'mm', format: pageSize = 'a4' } = options;
        const pdf = new jsPDF(orientation, unit, pageSize);
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;
        const width = pdfWidth - 20;
        const height = width / ratio;

        pdf.setFontSize(16);
        pdf.text(data.name, pdfWidth / 2, 15, { align: 'center' });
        pdf.addImage(imgData, 'JPEG', 10, 25, width, height);
        pdf.save(`${title}.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `${title}.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, 1.0);
        link.click();
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="glass-panel sticky top-4 z-50 mx-4 mt-4 p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1.5 rounded-lg flex items-center justify-center">
              <FileText size={20} />
            </span>
            {editMode ? (
              <input
                value={data.name}
                onChange={(e) => updateNode('root', { name: e.target.value })}
                className="bg-transparent border-none outline-none focus:ring-0 w-64 text-xl font-extrabold"
                placeholder="Chart Title"
              />
            ) : <span className="text-xl font-extrabold">{data.name}</span>}
          </h1>
          <p className="text-xs text-slate-500 font-medium ml-10">
            {editMode ? 'Editing WBS Structure' : 'Interactive Org Chart Viewer'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100/50 rounded-lg border border-slate-200/50">
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-2 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Monitor size={18} />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-2 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Tablet size={18} />
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${editMode
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            {editMode ? <><Check size={18} /> Done</> : <><Edit3 size={18} /> Edit Chart</>}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              Download
            </button>

            <AnimatePresence>
              {showDownloadMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[100]"
                >
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">PDF Formats</span>
                  </div>
                  <button onClick={() => handleDownload('pdf')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2">
                    <FileText size={16} className="text-red-500" /> A4 Portrait
                  </button>
                  <button onClick={() => handleDownload('pdf', { orientation: 'l' })} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100">
                    <FileText size={16} className="text-red-500" /> A4 Landscape
                  </button>

                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Image Formats</span>
                  </div>
                  <button onClick={() => handleDownload('png')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2">
                    <ImageIcon size={16} className="text-blue-500" /> PNG Image
                  </button>
                  <button onClick={() => handleDownload('jpeg')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2">
                    <ImageIcon size={16} className="text-blue-500" /> JPG High Quality
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-12 flex justify-center items-start bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
        <div
          ref={chartRef}
          className={`transition-all duration-500 ease-in-out p-8 bg-white/40 rounded-3xl ${viewMode === 'mobile' ? 'max-w-[480px]' : 'max-w-3xl'
            } w-full`}
        >
          <ChartNode
            node={data}
            level={0}
            onUpdate={updateNode}
            onAddChild={addChild}
            onDelete={deleteNode}
            editMode={editMode}
          />
        </div>
      </main>

      <footer className="p-6 text-center text-slate-400 text-xs font-semibold border-t border-slate-100 bg-white">
        Solar Chart Builder • Built for Halabja Solar • &copy; 2026
      </footer>

      {showDownloadMenu && <div className="fixed inset-0 z-[60]" onClick={() => setShowDownloadMenu(false)} />}
    </div>
  );
}

export default App;
