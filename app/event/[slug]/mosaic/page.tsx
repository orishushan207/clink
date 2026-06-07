import { getEventBySlug } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/server";
import MosaicWall from "@/components/MosaicWall";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function MosaicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { token } = await searchParams;

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  let isAdmin = false;
  if (token) {
    const { data } = await supabaseAdmin
      .from("events")
      .select("admin_token")
      .eq("id", event.id)
      .single();
    isAdmin = data?.admin_token === token;
  }

  return <MosaicWall event={event} isAdmin={isAdmin} adminToken={isAdmin ? token : undefined} />;
}
