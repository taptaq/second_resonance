import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MainStage from "../components/MainStage";
import Console from "../components/Console";
import RollbackModal from "../components/RollbackModal";
import { useAgentStore } from "../store/useAgentStore";
import { Loader2 } from "lucide-react";

export default function Room() {
  const { id } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { setRoomInfo, setSongInfo, setRoomId, setMessages } = useAgentStore();

  useEffect(() => {
    if (!id) return;
    setRoomId(id);
    
    let isSubscribed = true;
    const syncRoomClock = async () => {
      try {
        const res = await fetch(`http://localhost:3005/api/room/${id}`);
        const data = await res.json();
        if (!isSubscribed) return;
        
        setRoomInfo(data.room);
        setSongInfo(data.song);
        if (data.room?.messages) {
          setMessages(data.room.messages);
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Room sync desync:", err);
      }
    };

    syncRoomClock();
    const interval = setInterval(syncRoomClock, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [id, setRoomId, setRoomInfo, setSongInfo, setMessages]);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#050505] text-slate-300 font-sans overflow-hidden flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <MainStage />
        <Console onOpenModal={() => setIsModalOpen(true)} />
      </div>
      {isModalOpen && <RollbackModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
