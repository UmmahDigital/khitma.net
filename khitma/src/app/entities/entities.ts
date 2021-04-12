
export const NUM_OF_AJZA = 30;

export const JUZ_STATUS = Object.freeze({
    IDLE: 0,
    BOOKED: 1,
    DONE: 2
});




export const KHITMA_CYCLE_TYPE = Object.freeze({
    AUTO_BOOK: 1,
    ALL_IDLE: 2,

});


export const KHITMA_GROUP_TYPE = Object.freeze({
    SEQUENTIAL: 'SEQUENTIAL',
    SAME_TASK: 'SAME_TASK',
});




export function GET_JUZ_READ_EXTERNAL_URL(juzIndex: number): string {

    const JUZ_START_PAGE = [
        1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582
    ];

    const PAGE_OFFSET = 2;

    let url = "https://app.quranflash.com/book/Medina1?ar#/reader/chapter/" + (JUZ_START_PAGE[juzIndex] + PAGE_OFFSET);

    return url;
}


export class Juz {
    index: number;
    status: number;
    owner: string;

    public constructor(init?: Partial<Juz>) {
        Object.assign(this, init);
    }

    static nextStatus(juzStatus) {

        const JUZ_STATUS_COUNT = 3;

        return (juzStatus + 1) % JUZ_STATUS_COUNT;
    }

}


export class KhitmaGroup {
    id?: string;
    title?: string;
    description?: string;
    author?: string;
    creationDate?: Date;
    ajza?: Juz[];
    cycle?: number;
    targetDate?: string;
    admins?: string;
    type?: string;

    public constructor(init?: Partial<KhitmaGroup>) {
        Object.assign(this, init);
        this.cycle = init.cycle || 0;
        this._initAjza();
    }

    public isDone() {
        return this.ajza.every(juz => juz.status === JUZ_STATUS.DONE);
    }

    private _initAjza() {
        this.ajza = [];
        for (var i = 0; i < NUM_OF_AJZA; i++) {
            this.ajza.push(new Juz({ index: i, status: JUZ_STATUS.IDLE }))
        }

        // this.ajza = Array(NUM_OF_AJZA).fill(new Juz());
    }

    public assignJuz(juzIndex, owner) {
        this.ajza[juzIndex].owner = owner;
    }

    public getURL() {
        return location.origin + '/group/' + this.id;
    }

    toJson() {

        let res = new KhitmaGroup(this);

        // convert to native js object
        res.ajza = this.ajza.map((obj) => { return Object.assign({}, obj) });

        return res;
    }

    getAjzaObj() {
        return { ...this.ajza.map((obj) => { return Object.assign({}, obj) }) };
    }

    public isAdmin(username) {
        return username == this.author || this.admins?.includes(username);
    }

    public hasIdleAjza() {
        for (var i = 0; i < NUM_OF_AJZA; i++) {
            if (this.ajza[i].status == JUZ_STATUS.IDLE) {
                return true;
            }
        }

        return false;
    }

    public getMyJuzIndex(owner) {

        let myJuz = this.ajza.find(juz => juz.owner === owner && juz.status === JUZ_STATUS.BOOKED);

        return myJuz ? myJuz.index : null;
    }


    static getEmptyAjzaObj() {

        let ajza = KhitmaGroup.getEmptyAjzaArray();

        return { ...ajza.map((obj) => { return Object.assign({}, obj) }) };
    }

    static getEmptyAjzaArray() {

        let ajza = [];
        for (var i = 0; i < NUM_OF_AJZA; i++) {
            ajza.push(new Juz({ index: i, status: JUZ_STATUS.IDLE }))
        }

        return ajza;
    }


    static convertAjzaToObj(ajza: Juz[]) {

        return { ...ajza.map((obj) => { return Object.assign({}, obj) }) };
    }

    static convertAjzaToArray(ajza: object): Juz[] {

        if (!ajza) {
            return [];
        }

        return Object.values(ajza).sort((a: any, b: any) => (a.index > b.index) ? 1 : -1);
    }

    static refineOwnerName(name) {
        return name.trim();
    }

}

export class SameTaskKhitmaGroup extends KhitmaGroup {
    task: string;
    members: GroupMember[];

    public constructor(init?: Partial<SameTaskKhitmaGroup>) {
        super(init);


        this.members = Object.values(init.members).sort((m1, m2) => (m1.name > m2.name ? 1 : -1));

    }

    public getCounts() {

        return {
            total: this.members.length,
            done: this.members.filter(function (item) { return item.isTaskDone; }).length
        };

    }

    public isTaskDone(member: GroupMember) {

        return {
            total: this.members.length,
            done: this.members.filter(function (item) { return item.isTaskDone; }).length
        };

    }

    public createGroupMember(username) {

        let isDone = this.members.find(m => m.name === username)?.isTaskDone;

        return new GroupMember({
            name: username,
            isTaskDone: isDone
        });
    }

    public resetMembersTaskStatus() {
        this.members.forEach((member) => {
            member.isTaskDone = false;
        })
    }

    public getMembersObj() {

        return this.members.reduce((m, { name, isTaskDone }) => ({
            ...m, [name]: {
                name: name,
                isTaskDone: isTaskDone
            }
        }), {});

    }
}

export class GroupMember {
    name: string
    isTaskDone: boolean;

    public constructor(init?: Partial<GroupMember>) {
        Object.assign(this, init);
    }
}