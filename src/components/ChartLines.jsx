import React, { useEffect, useRef } from 'react';

const ChartLines = ({ contentRef }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    let animationFrameId;
    let pathsMap = new Map();

    const updateLines = () => {
      const container = contentRef.current;
      const svg = svgRef.current;
      if (!container || !svg) return;
      
      const containerRect = container.getBoundingClientRect();
      const scale = containerRect.width / container.offsetWidth || 1; 

      const getLocalCoords = (element) => {
         const rect = element.getBoundingClientRect();
         return {
            x: (rect.left - containerRect.left) / scale,
            y: (rect.top - containerRect.top) / scale,
            width: rect.width / scale,
            height: rect.height / scale,
         };
      };

      const nodes = container.querySelectorAll('[data-node-id]');
      const currentIds = new Set();

      nodes.forEach(nodeEl => {
        const parentId = nodeEl.getAttribute('data-parent-id');
        if (!parentId || parentId === 'null') return;
        const parentEl = container.querySelector(`[data-node-id="${parentId}"]`);
        if (!parentEl) return;

        const childBox = nodeEl.firstElementChild;
        const parentBox = parentEl.firstElementChild;
        if (!childBox || !parentBox) return;

        const childRect = getLocalCoords(childBox);
        const parentRect = getLocalCoords(parentBox);

        const startX = parentRect.x + parentRect.width / 2;
        const startY = parentRect.y + parentRect.height;
        const endX = childRect.x + childRect.width / 2;
        const endY = childRect.y;

        const distanceY = Math.abs(endY - startY);
        const distanceX = Math.abs(endX - startX);
        const isHorizontal = distanceX > distanceY * 2;

        let pathData = '';
        if (isHorizontal) {
           const isRight = endX > startX;
           const sX = isRight ? parentRect.x + parentRect.width : parentRect.x;
           const sY = parentRect.y + parentRect.height / 2;
           const eX = isRight ? childRect.x : childRect.x + childRect.width;
           const eY = childRect.y + childRect.height / 2;
           pathData = `M ${sX} ${sY} C ${sX + (isRight ? 40 : -40)} ${sY}, ${eX + (isRight ? -40 : 40)} ${eY}, ${eX} ${eY}`;
        } else {
           const curveControlYOffset = Math.max(distanceY / 2, 20);
           pathData = `M ${startX} ${startY + 2} C ${startX} ${startY + curveControlYOffset}, ${endX} ${endY - curveControlYOffset}, ${endX} ${endY - 2}`;
        }

        const pathId = `${parentId}-${nodeEl.getAttribute('data-node-id')}`;
        currentIds.add(pathId);

        let pathEl = pathsMap.get(pathId);
        if (!pathEl) {
           pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
           pathEl.setAttribute('fill', 'none');
           pathEl.setAttribute('stroke', '#94a3b8');
           pathEl.setAttribute('stroke-width', '2');
           svg.appendChild(pathEl);
           pathsMap.set(pathId, pathEl);
        }
        
        if (pathEl.getAttribute('d') !== pathData) {
            pathEl.setAttribute('d', pathData);
        }
      });

      for (const [id, pathEl] of pathsMap.entries()) {
          if (!currentIds.has(id)) {
              pathEl.remove();
              pathsMap.delete(id);
          }
      }

      animationFrameId = requestAnimationFrame(updateLines);
    };

    updateLines();

    return () => cancelAnimationFrame(animationFrameId);
  }, [contentRef]);

  return (
    <svg 
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    />
  );
};

export default ChartLines;
