import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChartNode = ({ node, parentId, level, onUpdate, onAddChild, onDelete, editMode, chartLayout = 'classic' }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    const getColorClass = (lvl) => {
        const levels = ['level-0', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6', 'level-7'];
        return levels[lvl % levels.length];
    };

    // Layout configuration logic
    const isOrgChart = chartLayout === 'org';
    const isMindmap = chartLayout === 'mindmap';

    // Determine if we should force horizontal layout based on depth (for classic mode)
    const isDeepClassic = (!isOrgChart && !isMindmap) && level >= 3;

    const handleNameChange = (e) => {
        onUpdate(node.id, { name: e.target.value });
    };

    const levelClass = getColorClass(level);

    // Dynamic styling based on layout type (Removed solid CSS borders, relying on ChartLines SVG)
    const wrapperClass = isOrgChart ? "flex flex-col items-center mb-6 relative"
        : isMindmap ? "flex flex-col items-center mb-4 relative"
            : `flex flex-col mb-4 relative ${isDeepClassic ? 'w-[300px]' : ''}`;

    const childrenContainerClass = isOrgChart ? "flex flex-row flex-wrap justify-center gap-6 mt-2 relative"
        : isMindmap ? "flex flex-row flex-wrap justify-center gap-8 mt-4 relative"
            : `flex ${isDeepClassic ? 'flex-row flex-wrap justify-center gap-6 ml-0 pl-0' : 'flex-col gap-3 py-2 mt-2'} relative`;

    const childItemClass = isOrgChart ? "relative flex flex-col items-center"
        : isMindmap ? "relative min-w-[200px]"
            : isDeepClassic ? 'min-w-[200px] max-w-[280px] flex-1' : '';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={wrapperClass}
            drag={!editMode}
            dragMomentum={false}
            onPointerDown={(e) => e.stopPropagation()}
            data-node-id={node.id}
            data-parent-id={parentId}
            style={{
                x: node.position?.x || 0,
                y: node.position?.y || 0,
                zIndex: 10
            }}
            onDragEnd={(e, info) => {
                const content = document.querySelector('[data-chart-content]');
                let scale = 1;
                if (content) {
                    const contentRect = content.getBoundingClientRect();
                    scale = contentRect.width / content.offsetWidth;
                }
                const newX = (node.position?.x || 0) + info.offset.x / scale;
                const newY = (node.position?.y || 0) + info.offset.y / scale;
                onUpdate(node.id, { position: { x: newX, y: newY } });
            }}
            onDragStart={(e) => {
                e.target.style.zIndex = 50;
            }}
        >
            <div
                className={`
          flex items-center gap-4 p-4 rounded-2xl shadow-xl transition-all duration-500
          ${levelClass} ${editMode ? 'cursor-default' : 'cursor-pointer hover:shadow-2xl hover:-translate-y-1'}
          ${node.isEmpty ? 'bg-white/10 border-dashed border-slate-300' : 'border border-white/20'}
          ${isOrgChart ? 'z-10' : ''}
        `}
                onClick={() => !editMode && hasChildren && setIsExpanded(!isExpanded)}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1.5 transition-colors absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-700 shadow border border-slate-200 z-20"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}

                <div className="flex flex-col flex-1 min-w-0 text-white">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-70 font-mono mb-1">
                        {node.code}
                    </span>
                    {editMode ? (
                        <input
                            type="text"
                            value={node.name}
                            onChange={handleNameChange}
                            className="bg-black/10 border-none outline-none font-bold text-base w-full focus:bg-black/20 rounded-lg px-2 py-1 placeholder-white/50 text-white"
                            autoFocus={node.name === 'New Item'}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="text-base font-bold tracking-tight">
                            {node.name}
                        </span>
                    )}
                </div>

                {editMode && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
                            className="p-1.5 bg-black/10 hover:bg-black/20 rounded-lg text-white transition-all transform hover:scale-105"
                            title="Add child"
                        >
                            <Plus size={16} />
                        </button>
                        {level > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                                className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg text-white transition-all transform hover:scale-105"
                                title="Delete node"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isExpanded && hasChildren && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className={isOrgChart ? "flex flex-row justify-center relative mt-8" : childrenContainerClass}
                    >
                        {node.children.map((child) => {
                            if (isOrgChart) {
                                return (
                                    <div key={child.id} className="relative flex flex-col items-center px-4 pt-8">
                                        <ChartNode
                                            node={child}
                                            parentId={node.id}
                                            level={level + 1}
                                            onUpdate={onUpdate}
                                            onAddChild={onAddChild}
                                            onDelete={onDelete}
                                            editMode={editMode}
                                            chartLayout={chartLayout}
                                        />
                                    </div>
                                );
                            }

                            return (
                                <div key={child.id} className={childItemClass}>
                                    <ChartNode
                                        node={child}
                                        parentId={node.id}
                                        level={level + 1}
                                        onUpdate={onUpdate}
                                        onAddChild={onAddChild}
                                        onDelete={onDelete}
                                        editMode={editMode}
                                        chartLayout={chartLayout}
                                    />
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
export default ChartNode;
