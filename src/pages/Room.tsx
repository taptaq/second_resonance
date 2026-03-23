import { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MainStage from '../components/MainStage';
import Console from '../components/Console';
import RollbackModal from '../components/RollbackModal';

export default function Room() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-[#050505] text-slate-300 font-sans overflow-hidden flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainStage />
        <Console onOpenModal={() => setIsModalOpen(true)} />
      </div>
      {isModalOpen && <RollbackModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
