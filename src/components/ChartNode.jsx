import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChartNode = ({ node, level, onUpdate, onAddChild, onDelete, editMode }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    const handleNameChange = (e) => {
        onUpdate(node.id, { name: e.target.value });
    };

    const levelClass = `level-${Math.min(level, 4)}`;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col mb-4 relative"
        >
            <div
                className={`
          flex items-center gap-4 p-4 rounded-2xl shadow-xl border-t border-white/30 transition-all duration-500
          ${levelClass} ${editMode ? 'cursor-default' : 'cursor-pointer node-hover'}
          ${node.isEmpty ? 'bg-white/10 border-dashed border-slate-300' : ''}
        `}
                onClick={() => !editMode && hasChildren && setIsExpanded(!isExpanded)}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                )}

                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-60 font-mono mb-0.5">
                        {node.code}
                    </span>
                    {editMode ? (
                        <input
                            type="text"
                            value={node.name}
                            onChange={handleNameChange}
                            className="bg-white/10 border-none outline-none font-bold text-base w-full focus:bg-white/20 rounded-lg px-2 py-1 placeholder-white/50"
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all hover:scale-110 active:scale-95"
                            title="Add child"
                        >
                            <Plus size={18} />
                        </button>
                        {level > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                                className="p-2 bg-rose-500/20 hover:bg-rose-500/40 rounded-xl text-white transition-all hover:scale-110 active:scale-95"
                                title="Delete node"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isExpanded && hasChildren && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, x: -20 }}
                        animate={{ height: 'auto', opacity: 1, x: 0 }}
                        exit={{ height: 0, opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="ml-10 mt-3 flex flex-col gap-2 border-l-2 border-slate-200/50 pl-6 overflow-hidden"
                    >
                        {node.children.map((child, index) => (
                            <motion.div
                                key={child.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <ChartNode
                                    node={child}
                                    level={level + 1}
                                    onUpdate={onUpdate}
                                    onAddChild={onAddChild}
                                    onDelete={onDelete}
                                    editMode={editMode}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ChartNode;
