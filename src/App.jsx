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

const PAPER_DIMENSIONS = {
  a4: { portrait: { width: 794, height: 1123 }, landscape: { width: 1123, height: 794 } },
  a3: { portrait: { width: 1123, height: 1587 }, landscape: { width: 1587, height: 1123 } }
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
  const [showPageSetup, setShowPageSetup] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [paperFormat, setPaperFormat] = useState('a4'); // 'a4' or 'a3'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' or 'landscape'
  const [chartLayout, setChartLayout] = useState('classic'); // 'classic', 'org', 'mindmap'
  const [scale, setScale] = useState(1);
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('wbs_data', JSON.stringify(data));
  }, [data]);

  const updateScale = useCallback(() => {
    if (!containerRef.current || !chartRef.current) return;

    const chart = chartRef.current;

    // 1. Reset scale to measure true natural size
    chart.style.transform = 'scale(1)';
    chart.style.width = 'max-content'; // Allow it to expand to its full natural width
    chart.style.height = 'auto';

    // 2. Add a tiny delay or use offset to get real dimensions after layout
    const contentWidth = chart.scrollWidth;
    const contentHeight = chart.scrollHeight;

    // 3. Define the target area (Paper size minus 80px total padding)
    const paperDims = PAPER_DIMENSIONS[paperFormat][orientation];
    const targetWidth = paperDims.width - 120; // 60px margin on each side
    const targetHeight = paperDims.height - 120;

    // 4. Calculate the perfect scale factor to fit BOTH dimensions
    const scaleX = targetWidth / contentWidth;
    const scaleY = targetHeight / contentHeight;

    // Force a fit (never go above 1.1x to avoid blurriness, but ALWAYS fit if larger)
    const newScale = Math.min(scaleX, scaleY);

    setScale(newScale);

    // 5. Restore fixed dimensions for the "Paper" effect
    chart.style.width = `${PAPER_DIMENSIONS[paperFormat][orientation].width}px`;
    chart.style.height = `${PAPER_DIMENSIONS[paperFormat][orientation].height}px`;
    chart.style.transform = `scale(${newScale})`;
  }, [paperFormat, orientation, data, chartLayout]);

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
  }, [updateScale, data, editMode, viewMode, chartLayout]);

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

      // Calculate target dimensions for "force fitting"
      // Using standard 96 DPI for CSS pixels
      const mmToPx = 3.78;
      const dims = {
        a4: { p: [210, 297], l: [297, 210] },
        a3: { p: [297, 420], l: [420, 297] }
      };

      const currentOrientation = (options.orientation || orientation) === 'portrait' ? 'p' : 'l';
      const [wMm, hMm] = dims[paperFormat][currentOrientation];
      const targetWidth = wMm * mmToPx;
      const targetHeight = hMm * mmToPx;

      element.style.transform = 'none';

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
        width: targetWidth,
        height: targetHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-chart-container]');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            clonedElement.style.width = `${targetWidth}px`;
            clonedElement.style.height = `${targetHeight}px`;
            clonedElement.style.padding = '40px';
            clonedElement.style.display = 'flex';
            clonedElement.style.flexDirection = 'column';
            clonedElement.style.alignItems = 'center';
            clonedElement.style.justifyContent = 'center';

            // Force animations and glass effects to clear
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
      const filename = `${title}_${timestamp}_${paperFormat}_${orientation}`;

      if (format === 'pdf') {
        const pdf = new jsPDF({
          orientation: currentOrientation,
          unit: 'mm',
          format: paperFormat
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.setFontSize(20);
        pdf.setTextColor(30, 41, 59);
        pdf.text(data.name, pdfWidth / 2, 15, { align: 'center' });

        // Use full page minus small margins for the chart
        const margin = 5;
        pdf.addImage(imgData, 'JPEG', margin, 25, pdfWidth - (margin * 2), pdfHeight - 35, undefined, 'FAST');
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
    <div className="min-h-screen mesh-gradient flex flex-col font-sans selection:bg-primary/20">
      {/* Premium Header/Toolbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/50 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-tight">Solar Chart Builder</h1>
            <p className="text-xs text-slate-500 font-medium">Halabja Solar Infrastructure</p>
          </div>
        </div>

        {/* Central Controls Group */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/50 backdrop-blur-md">

          {/* Chart Layout Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowPageSetup(false); setShowDownloadMenu(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showLayoutMenu ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
            >
              <div className="w-4 h-4 rounded-sm border-2 border-current grid grid-cols-2 gap-0.5 p-0.5">
                <div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" />
              </div>
              Layout: {chartLayout === 'classic' ? 'Cascading WBS' : chartLayout === 'org' ? 'Organization' : 'Mindmap'}
            </button>
            <AnimatePresence>
              {showLayoutMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 left-0 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-2 z-50 overflow-hidden"
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3 pt-2">Chart Design</div>
                  {[
                    { id: 'classic', label: 'Cascading WBS', desc: 'Standard project breakdown' },
                    { id: 'org', label: 'Organization Chart', desc: 'Horizontal branching tree' },
                    { id: 'mindmap', label: 'Vertical Mindmap', desc: 'Radiating hub and spoke' }
                  ].map(layout => (
                    <button
                      key={layout.id}
                      onClick={() => { setChartLayout(layout.id); setShowLayoutMenu(false); }}
                      className={`w-full flex flex-col items-start px-3 py-2.5 rounded-xl transition-all ${chartLayout === layout.id ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      <span className="font-semibold text-sm">{layout.label}</span>
                      <span className="text-[10px] opacity-70">{layout.desc}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-slate-200/50 mx-1" />

          {/* Page Setup Menu */}
          <div className="relative">
            <button
              onClick={() => { setShowPageSetup(!showPageSetup); setShowLayoutMenu(false); setShowDownloadMenu(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showPageSetup ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
            >
              <Monitor size={16} />
              Page: {paperFormat.toUpperCase()} {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
            </button>
            <AnimatePresence>
              {showPageSetup && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-4 z-50"
                >
                  <div className="mb-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Paper Formats</label>
                    <div className="flex bg-slate-100/50 p-1 rounded-xl">
                      {['a4', 'a3'].map((format) => (
                        <button
                          key={format}
                          onClick={() => setPaperFormat(format)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${paperFormat === format ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Orientation</label>
                    <div className="flex bg-slate-100/50 p-1 rounded-xl">
                      {['portrait', 'landscape'].map((ori) => (
                        <button
                          key={ori}
                          onClick={() => setOrientation(ori)}
                          className={`flex-1 flex justify-center items-center py-1.5 rounded-lg transition-all ${orientation === ori ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                          title={ori}
                        >
                          <div className={`border-2 border-inherit rounded-sm ${ori === 'portrait' ? 'w-3 h-4' : 'w-4 h-3'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-slate-200/50 mx-1" />

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${editMode ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
          >
            {editMode ? <Check size={16} /> : <Edit3 size={16} />}
            {editMode ? 'Done Editing' : 'Edit Chart'}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => { setShowDownloadMenu(!showDownloadMenu); setShowPageSetup(false); setShowLayoutMenu(false); }}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
            >
              {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isDownloading ? 'Generating...' : 'Export'}
            </button>

            <AnimatePresence>
              {showDownloadMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 right-0 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-2 z-50 overflow-hidden"
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3 pt-2">PDF Formats</div>
                  <button onClick={() => handleDownload('pdf')} className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 rounded-xl">
                    <FileText size={16} className="text-red-500" /> PDF (Current View)
                  </button>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider my-2 px-3 pt-2">Image Formats</div>
                  <button onClick={() => handleDownload('png')} className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 rounded-xl">
                    <ImageIcon size={16} className="text-blue-500" /> PNG Image
                  </button>
                  <button onClick={() => handleDownload('jpeg')} className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 rounded-xl">
                    <ImageIcon size={16} className="text-blue-500" /> JPG High Quality
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main
        ref={containerRef}
        className="flex-1 overflow-hidden relative p-8 isolate flex items-start justify-center"
      >
        <div
          className="absolute inset-0 z-[-1]"
          style={{
            backgroundImage: 'radial-gradient(circle at center, var(--slate-200) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: 0.4
          }}
        />

        {/* Paper Container */}
        <div
          ref={chartRef}
          data-chart-container
          style={{
            width: `${PAPER_DIMENSIONS[paperFormat][orientation].width}px`,
            height: `${PAPER_DIMENSIONS[paperFormat][orientation].height}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: isDownloading ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
          className="bg-white/80 backdrop-blur-3xl rounded-[2rem] p-16 transition-all duration-700 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col items-center justify-start border border-white"
        >
          <ChartNode
            node={data}
            level={0}
            onUpdate={updateNode}
            onAddChild={addChild}
            onDelete={deleteNode}
            editMode={editMode}
            chartLayout={chartLayout}
          />
        </div>
      </main>

      <footer className="p-4 text-center text-slate-400 text-[10px] font-bold tracking-widest uppercase border-t border-slate-200/50 bg-white/50 backdrop-blur-md flex-shrink-0 z-10 relative">
        Solar Chart Builder • Built for Halabja Solar • &copy; 2026
      </footer>

      {(showDownloadMenu || showPageSetup || showLayoutMenu) && (
        <div
          className="fixed inset-0 z-[49] bg-slate-900/5 backdrop-blur-[1px]"
          onClick={() => { setShowDownloadMenu(false); setShowPageSetup(false); setShowLayoutMenu(false); }}
        />
      )}
    </div >
  );
}

export default App;
