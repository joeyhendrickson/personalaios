import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RelationshipMailboxImportPanel } from '@/components/relationship-manager/RelationshipMailboxImportPanel'

export default async function RelationshipMailboxPage({
  params,
}: {
  params: Promise<{ relationshipId: string }>
}) {
  const { relationshipId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Sign in to import mailbox data.</p>
        <Link href="/login" className="mt-4 inline-block text-sm underline">
          Log in
        </Link>
      </div>
    )
  }

  const { data: rel } = await supabase
    .from('relationships')
    .select('id, name')
    .eq('id', relationshipId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!rel) {
    return (
      <div className="p-8">
        <p className="text-destructive">Contact not found.</p>
        <Link href="/modules/relationship-manager" className="mt-4 inline-block text-sm underline">
          All relationships
        </Link>
      </div>
    )
  }

  return (
    <RelationshipMailboxImportPanel relationshipId={rel.id} relationshipName={String(rel.name)} />
  )
}
