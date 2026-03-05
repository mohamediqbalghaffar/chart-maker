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
        <div className="flex flex-col mb-2 relative">
            <div
                className={`
          flex items-center gap-3 p-3 rounded-xl shadow-sm border-2 transition-all duration-300
          ${levelClass} ${editMode ? 'cursor-default' : 'cursor-pointer hover:-translate-y-1 hover:shadow-md'}
          ${node.isEmpty ? 'border-dashed opacity-70 bg-slate-800/5' : 'text-white'}
        `}
                onClick={() => !editMode && hasChildren && setIsExpanded(!isExpanded)}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="flex-shrink-0 hover:bg-white/10 rounded p-1 transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                )}

                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-80 font-mono">
                        {node.code}
                    </span>
                    {editMode ? (
                        <input
                            type="text"
                            value={node.name}
                            onChange={handleNameChange}
                            className="bg-transparent border-none outline-none font-semibold text-sm w-full focus:bg-white/20 rounded px-1"
                            autoFocus={node.name === 'New Item'}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="text-sm font-semibold truncate">
                            {node.name}
                        </span>
                    )}
                </div>

                {editMode && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
                            className="p-1 hover:bg-white/20 rounded text-white"
                            title="Add child"
                        >
                            <Plus size={16} />
                        </button>
                        {level > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                                className="p-1 hover:bg-red-500/40 rounded text-white"
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
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-8 mt-2 flex flex-col gap-1 overflow-hidden"
                    >
                        {node.children.map((child) => (
                            <ChartNode
                                key={child.id}
                                node={child}
                                level={level + 1}
                                onUpdate={onUpdate}
                                onAddChild={onAddChild}
                                onDelete={onDelete}
                                editMode={editMode}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChartNode;
