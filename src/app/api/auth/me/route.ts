import { NextResponse } from "next/server";
import { getSession, requireShopSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      // Return demo session so app works seamlessly out of the box
      const demo = await requireShopSession();
      return NextResponse.json({ user: demo, isDemo: true });
    }
    return NextResponse.json({ user: session, isDemo: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
