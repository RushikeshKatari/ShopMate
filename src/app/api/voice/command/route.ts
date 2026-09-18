import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { AICommandService } from "@/services/AICommandService";

export async function POST(req: Request) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { text, conversationState, confirmExecution, language } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Voice/text command is required" },
        { status: 400 }
      );
    }

    const response = await AICommandService.processCommand({
      shopId: session.shopId,
      text: text.trim(),
      language,
      conversationState,
      confirmExecution,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        speechResponse: error.message || "An error occurred while processing your command.",
      },
      { status: 500 }
    );
  }
}
