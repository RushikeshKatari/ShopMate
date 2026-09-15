import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, phone, password, shopName } = await req.json();

    if (!name || !email || !password || !shopName) {
      return NextResponse.json(
        { error: "Name, email, password, and shop name are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
        },
      });

      const shop = await tx.shop.create({
        data: {
          name: shopName,
          ownerId: newUser.id,
          phone,
          currency: "INR",
        },
      });

      await tx.setting.create({
        data: {
          shopId: shop.id,
          shopName,
          language: "en-IN",
          currency: "INR",
        },
      });

      return { user: newUser, shop };
    });

    const sessionPayload = {
      id: user.user.id,
      name: user.user.name,
      email: user.user.email,
      phone: user.user.phone,
      shopId: user.shop.id,
      shopName: user.shop.name,
    };

    const token = signToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
