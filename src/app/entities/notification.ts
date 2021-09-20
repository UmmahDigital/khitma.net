
export class NotificationAction {
    text: string;
    url: string;
}

export class GloablNotification {
    id: string;
    title: string;
    text: string;
    actions: NotificationAction[] = [];
    isActive: boolean

    public constructor(init?: Partial<GloablNotification>) {
        Object.assign(this, init);
    }
}
