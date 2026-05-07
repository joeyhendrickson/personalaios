'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { Goal } from '@/types'

type DragHandleSlot = ReactNode

function SortableProjectCard({
  project,
  renderProject,
}: {
  project: Goal
  renderProject: (project: Goal, slot: { dragHandle: DragHandleSlot }) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  const dragHandle = (
    <button
      type="button"
      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-grab active:cursor-grabbing touch-none"
      aria-label="Drag to reorder project"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-5 w-5" />
    </button>
  )

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-70' : undefined}>
      {renderProject(project, { dragHandle })}
    </div>
  )
}

export function DraggableProjectsGrid({
  projects,
  onReorder,
  renderProject,
}: {
  projects: Goal[]
  onReorder: (orders: { id: string; project_sort_order: number }[]) => Promise<void>
  renderProject: (project: Goal, slot: { dragHandle: DragHandleSlot }) => ReactNode
}) {
  const [busy, setBusy] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setBusy(true)
    try {
      const oldIndex = projects.findIndex((p) => p.id === active.id)
      const newIndex = projects.findIndex((p) => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const next = arrayMove(projects, oldIndex, newIndex)
      const projectOrders = next.map((p, index) => ({
        id: p.id,
        project_sort_order: index,
      }))
      await onReorder(projectOrders)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={projects.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${busy ? 'pointer-events-none opacity-80' : ''}`}
        >
          {projects.map((project) => (
            <SortableProjectCard key={project.id} project={project} renderProject={renderProject} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
