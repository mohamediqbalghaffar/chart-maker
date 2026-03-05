import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import ChartNode from './components/ChartNode';
import { Download, Edit3, Monitor, Tablet, Check, X, FileText, Image as ImageIcon, Loader2, Maximize } from 'lucide-react';
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
  const [scale, setScale] = useState(1);
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('wbs_data', JSON.stringify(data));
  }, [data]);

  const updateScale = useCallback(() => {
    if (!containerRef.current || !chartRef.current) return;

    const container = containerRef.current;
    const chart = chartRef.current;

    // Temporarily reset scale to measure actual content size
    const originalTransform = chart.style.transform;
    chart.style.transform = 'none';

    const contentWidth = chart.offsetWidth;
    const contentHeight = chart.offsetHeight;
    const containerWidth = container.offsetWidth - 40; // 20px padding
    const containerHeight = container.offsetHeight - 40;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newScale = Math.min(Math.min(scaleX, scaleY), 1);

    setScale(newScale);
    chart.style.transform = originalTransform;
  }, []);

  useLayoutEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    const observer = new ResizeObserver(updateScale);
    if (chartRef.current) observer.observe(chartRef.current);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, [updateScale, data, editMode, viewMode]);

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
    if (isDownloading) return;
    setIsDownloading(true);
    setShowDownloadMenu(false);

    // Give the UI a moment to close the menu and update state
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const element = chartRef.current;
      const originalTransform = element.style.transform;

      // Reset scale for high-res capture
      element.style.transform = 'none';

      const canvas = await html2canvas(element, {
        scale: 3, // Even higher resolution
        useCORS: true,
        backgroundColor: '#f8fafc', // Use a clean background
        logging: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-chart-container]');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            clonedElement.style.width = 'auto';
            clonedElement.style.padding = '60px';
            // Force animations to end and remove glass effects that struggle in export
            clonedElement.querySelectorAll('*').forEach(el => {
              el.style.animation = 'none';
              el.style.transition = 'none';
              el.style.backdropFilter = 'none';
            });
          }
        }
      });

      element.style.transform = originalTransform;

      const title = data.name.replace(/\s+/g, '_') || 'chart';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${title}_${timestamp}`;

      if (format === 'pdf') {
        const { orientation = 'p' } = options;
        const pdf = new jsPDF({
          orientation: orientation,
          unit: 'mm',
          format: 'a4'
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate dimensions to fit the page while maintaining aspect ratio
        const imgProps = pdf.getImageProperties(imgData);
        const margin = 10;
        const maxWidth = pdfWidth - (margin * 2);
        const maxHeight = pdfHeight - (margin * 3); // Extra space for title

        let finalWidth = maxWidth;
        let finalHeight = (imgProps.height * finalWidth) / imgProps.width;

        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = (imgProps.width * finalHeight) / imgProps.height;
        }

        const x = (pdfWidth - finalWidth) / 2;
        const y = 25; // Start below the title

        pdf.setFontSize(20);
        pdf.setTextColor(30, 41, 59); // slate-800
        pdf.text(data.name, pdfWidth / 2, 15, { align: 'center' });

        pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight, undefined, 'FAST');
        pdf.save(`${filename}.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, 1.0);
        link.click();
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col mesh-gradient overflow-hidden">
      <header className="glass-card z-50 mx-6 mt-6 p-4 rounded-2xl flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center">
              <FileText size={20} />
            </span>
            {editMode ? (
              <input
                value={data.name}
                onChange={(e) => updateNode('root', { name: e.target.value })}
                className="bg-transparent border-none outline-none focus:ring-0 w-64 text-xl font-extrabold"
                placeholder="Chart Title"
              />
            ) : <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">{data.name}</span>}
          </h1>
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
              className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {isDownloading ? (
                <><Loader2 className="animate-spin" size={18} /> Generating...</>
              ) : (
                <><Download size={18} /> Download</>
              )}
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

      <main
        ref={containerRef}
        className="flex-1 relative flex justify-center items-center p-4 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] overflow-hidden"
      >
        <div
          ref={chartRef}
          data-chart-container
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDownloading ? 'none' : 'transform 0.3s ease-out'
          }}
          className={`bg-white/40 rounded-3xl p-8 ${viewMode === 'mobile' ? 'w-[480px]' : 'w-full max-w-4xl'
            }`}
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

      <footer className="p-3 text-center text-slate-400 text-[10px] font-semibold border-t border-slate-100 bg-white flex-shrink-0">
        Solar Chart Builder • Built for Halabja Solar • &copy; 2026
      </footer>

      {showDownloadMenu && <div className="fixed inset-0 z-[60]" onClick={() => setShowDownloadMenu(false)} />}
    </div>
  );
}

export default App;
