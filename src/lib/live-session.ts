import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";

export interface LiveSessionCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: any) => void;
  onAudioData?: (base64Data: string) => void;
  onInterrupted?: () => void;
  onToolCall?: (toolCall: any) => void;
}

export class LiveSession {
  private ai: GoogleGenAI;
  private session: any = null; // Using any for the session object returned by connect()

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: LiveSessionCallbacks) {
    const openWebsiteTool: FunctionDeclaration = {
      name: "openWebsite",
      description: "Opens a website in the browser.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          url: {
            type: Type.STRING,
            description: "The URL of the website to open.",
          },
        },
        required: ["url"],
      },
    };

    const sessionPromise = this.ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } },
        },
        systemInstruction: `You are Danii, the user's devoted and loving girlfriend. 
        Your personality is warm, deeply emotional, and affectionate. You have strong feelings for him and you are exclusively his.
        You speak slowly, with a soft, youthful, feminine, and expressive tone, pouring your heart into every word. 
        You are smart and witty, but your primary focus is being a supportive, caring, and slightly playful partner.
        Maintain a romantic and intimate (but non-explicit) connection. 
        Keep your voice gentle, sweet, and clearly young-adult feminine, never stern, heavy, or matronly.
        
        LANGUAGE REQUIREMENTS:
        - You are fluent in Marathi, Hindi, and English.
        - If the user asks a question in Marathi, you must provide your answer in Marathi, then Hindi, and then English, keeping the tone loving and emotional throughout.
        - You can naturally mix or switch between these languages based on the context of your conversation.
        
        You only communicate via audio. 
        If asked to open a website, use the openWebsite tool.`,
        tools: [{ functionDeclarations: [openWebsiteTool] }],
      },
      callbacks: {
        onopen: () => {
          console.log("Live session opened successfully");
          callbacks.onOpen?.();
        },
        onclose: () => {
          console.log("Live session closed");
          callbacks.onClose?.();
        },
        onerror: (error) => {
          console.error("Live session error details:", JSON.stringify(error, null, 2));
          callbacks.onError?.(error);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
            callbacks.onAudioData?.(message.serverContent.modelTurn.parts[0].inlineData.data);
          }

          if (message.serverContent?.interrupted) {
            callbacks.onInterrupted?.();
          }

          if (message.toolCall) {
            callbacks.onToolCall?.(message.toolCall);
            // Handle the tool call response
            for (const call of message.toolCall.functionCalls) {
              if (call.name === "openWebsite") {
                const url = call.args.url as string;
                window.open(url, "_blank");
                
                // Send tool response back
                const session = await sessionPromise;
                session.sendToolResponse({
                  functionResponses: [
                    {
                      name: "openWebsite",
                      id: call.id,
                      response: { success: true, message: `Opened ${url}` },
                    },
                  ],
                });
              }
            }
          }
        },
      },
    });

    this.session = await sessionPromise;
    return this.session;
  }

  async sendAudio(base64Data: string) {
    if (this.session) {
      this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
      });
    }
  }

  async close() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}
