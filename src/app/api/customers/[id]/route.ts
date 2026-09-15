import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { CustomerService } from "@/services/CustomerService";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireShopSession();
    const customer = await CustomerService.getCustomerById(session.shopId, params.id);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { name, phone } = body;

    const updated = await prisma.customer.updateMany({
      where: { id: params.id, shopId: session.shopId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireShopSession();
    await prisma.customer.deleteMany({
      where: { id: params.id, shopId: session.shopId },
    });
    return NextResponse.json({ success: true, message: "Customer deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
