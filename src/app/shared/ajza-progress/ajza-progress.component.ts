import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { JUZ_STATUS, KHITMA_GROUP_TYPE } from '../../entities/entities';

export interface ProgressCounts {
  done: number;
  booked?: number;
  idle: number;
}

/** How far a group's current khitmah (or task) is: finished, booked and open ajza, or members done and not done. */
export function progressCounts(group: any): ProgressCounts | null {
  if (!group) {
    return null;
  }
  if (group.type === KHITMA_GROUP_TYPE.SAME_TASK || group.type === KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION) {
    const members = Object.values<any>(group.members ?? {});
    const done = members.filter((member) => member.isTaskDone).length;
    return { done, idle: members.length - done };
  }
  const ajza: any[] = Array.isArray(group.ajza) ? group.ajza : Object.values(group.ajza ?? {});
  const count = (status: number) => ajza.filter((juz) => juz.status === status).length;
  return { done: count(JUZ_STATUS.DONE), booked: count(JUZ_STATUS.BOOKED), idle: count(JUZ_STATUS.IDLE) };
}

/** The green / yellow / red bar of a group's progress, as on the home page. */
@Component({
  selector: 'app-ajza-progress',
  templateUrl: './ajza-progress.component.html',
  styleUrls: ['./ajza-progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AjzaProgressComponent {
  @Input() counts: ProgressCounts | null = null;
  /**
   * Shows "done/total" next to the bar and exposes it as a progress bar. Without it the bar is
   * decorative (on the home page it sits inside the group's link, whose name it must not change).
   */
  @Input() showCount = false;

  get total(): number {
    return (this.counts?.done ?? 0) + (this.counts?.booked ?? 0) + (this.counts?.idle ?? 0);
  }
}
