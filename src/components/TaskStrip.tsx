import { useMemo } from 'react';
import { Coins, Siren } from 'lucide-react';
import { isTaskNotice, useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { Bi, Btn } from './ui';

/** Round tasks the teacher put off ([later]) or that the clock jumped over wait here, out of the way. */
export function TaskStrip() {
  const notices = useGame((s) => s.notices);
  const tasks = useMemo(() => notices.filter((n) => isTaskNotice(n) && n.skipped), [notices]);
  const ack = useGame((s) => s.acknowledgeNotice);
  const { t } = useT();
  const head = tasks[0];
  if (!head) return null;
  const close = head.kind === 'roundClose';
  const ring = close ? '#F43F5E' : '#FFD700';
  return (
    <div
      key={head.uid}
      className="panel slide-down absolute bottom-[100px] left-[188px] right-4 z-[20] flex h-[56px] items-center gap-4 px-4"
      style={{ boxShadow: `0 0 0 4px ${ring}, 6px 6px 0 4px #000` }}
      role="status"
    >
      <span style={{ color: ring }}>{close ? <Siren size={30} strokeWidth={2.5} /> : <Coins size={30} strokeWidth={2.5} />}</span>
      <Bi k={close ? 'notice_roundClose_title' : 'notice_roundDraw_title'} p={{ round: head.round! }} size="md" px={[24, 15]} weight={700} inline className="min-w-0 flex-1 truncate" />
      {tasks.length > 1 && <span className="font-pixel text-[14px] text-gold">+{tasks.length - 1}</span>}
      <Btn tone={close ? 'coral' : 'gold'} className="h-[42px] px-5 text-[17px]" onClick={() => ack(head.uid, close ? undefined : 'gotoGacha')}>
        {t(close ? 'notice_roundClose_btn' : 'notice_roundDraw_btn')}
      </Btn>
    </div>
  );
}
