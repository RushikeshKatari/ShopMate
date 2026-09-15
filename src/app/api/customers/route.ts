import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { CustomerService } from "@/services/CustomerService";

export async function GET(req: Request) {
  try {
    const session = await requireShopSession();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const customers = await CustomerService.getCustomers(session.shopId, search);
    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { name, phone } = body;

    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const customer = await CustomerService.createCustomer({
      shopId: session.shopId,
      name,
      phone,
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
