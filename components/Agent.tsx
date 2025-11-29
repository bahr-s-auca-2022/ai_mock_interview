import { cn } from "@/lib/utils";
import Image from "next/image";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

const Agent = ({ userName }: AgentProps) => {
  const callStatus = CallStatus.FINISHED;
  const isSpeaking = true;
  const messages = [
    "What is your name? ",
    "My name is Abbas Bahr, nice to meet you",
  ];
  const lastMessages = messages[messages.length - 1];

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto gap-8 px-4">
      {/* Cards Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* AI Interviewer Card */}
        <div className="card-border flex-1">
          <div className="card p-8 flex flex-col items-center justify-center gap-4 h-full min-h-[320px]">
            <div className="relative">
              <div className="avatar size-28">
                <Image
                  src="/ai-avatar.png"
                  alt="AI Interviewer"
                  width={80}
                  height={80}
                  className="object-cover z-20 relative"
                />
                {isSpeaking && (
                  <>
                    <div className="animate-speak absolute inset-0" />
                    <div className="absolute -inset-4 bg-accent-teal/20 rounded-full animate-ping" />
                  </>
                )}
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-light-100 mb-2">
                AI Interviewer
              </h3>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="card-border flex-1">
          <div className="card p-8 flex flex-col items-center justify-center gap-4 h-full min-h-[320px]">
            <div className="avatar size-28">
              <Image
                src="/user-avatar1.jpeg"
                alt={userName}
                width={540}
                height={540}
                className="rounded-full object-cover size-[120px]"
              />
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-light-100 mb-2">
                {userName}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Section */}
      {messages.length > 0 && (
        <div className="w-full max-w-2xl">
          <div className="transcript-border">
            <div className="transcript min-h-20">
              <p
                key={lastMessages}
                className={cn(
                  "text-lg text-center text-light-100 leading-relaxed transition-all duration-500",
                  "animate-fadeIn"
                )}
              >
                {lastMessages}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex justify-center w-full mt-4">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call min-w-[140px]">
            <span
              className={cn(
                "absolute inset-0 animate-ping rounded-full bg-success-100 opacity-75",
                callStatus === "CONNECTING" ? "block" : "hidden"
              )}
            />
            <span className="relative z-10 font-semibold">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : "Connecting..."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect min-w-[140px] font-semibold">
            End Call
          </button>
        )}
      </div>
    </div>
  );
};

export default Agent;
