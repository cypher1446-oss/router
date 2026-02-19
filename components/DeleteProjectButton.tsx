'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteProjectButtonProps {
    id: string
    projectCode: string
}

export default function DeleteProjectButton({ id, projectCode }: DeleteProjectButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete project "${projectCode}"? This will permanently delete all related responses.`)) {
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`/api/admin/projects/${id}`, {
                method: 'DELETE',
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete project')
            }

            // Success - refresh the page to update the list
            router.refresh()

        } catch (error: any) {
            alert('Error: ' + error.message)
            console.error('Delete failed:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
            title="Delete Project"
        >
            {loading ? (
                <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                </span>
            ) : (
                'Delete'
            )}
        </button>
    )
}
