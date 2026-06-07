import { getEventBySlug } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/server";
import LiveWall from "@/components/LiveWall";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function LivePage({ params, searchParams }: Props) {
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

  return <LiveWall event={event} isAdmin={isAdmin} />;
}
