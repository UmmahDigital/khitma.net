
export const NUM_OF_AJZA = 30;
export const NUM_OF_PAGES = 604;

export const JUZ_STATUS = Object.freeze({
    IDLE: 0,
    BOOKED: 1,
    DONE: 2
});




export const KHITMA_CYCLE_TYPE = Object.freeze({
    AUTO_BOOK: 1,
    ALL_IDLE: 2,
    AUTO_BOOK_FOR_DONE_ONLY: 3
});


export const KHITMA_GROUP_TYPE = Object.freeze({
    SEQUENTIAL: 'SEQUENTIAL',
    SAME_TASK: 'SAME_TASK',
    PAGES_DISTRIBUTION: 'PAGES_DISTRIBUTION'
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
    cycle?: number;
    targetDate?: string;
    admins?: string;
    type?: string;

    public constructor(init?: Partial<KhitmaGroup>) {
        Object.assign(this, init);
        this.cycle = init.cycle || 0;
    }

    public getURL() {
        return location.origin + '/group/' + this.id;
    }

    public isAdmin(username) {
        return username == this.author || this.admins?.includes(username);
    }

    static refineOwnerName(name) {
        return name.trim();
    }

}


export class KhitmaGroup_Sequential extends KhitmaGroup {

    ajza?: Juz[];


    public constructor(init?: Partial<KhitmaGroup_Sequential>) {
        super(init);

        if (!this.ajza) {
            this._initAjza();
        }
    }

    private _initAjza() {
        this.ajza = [];
        for (var i = 0; i < NUM_OF_AJZA; i++) {
            this.ajza.push(new Juz({ index: i, status: JUZ_STATUS.IDLE }))
        }

        // this.ajza = Array(NUM_OF_AJZA).fill(new Juz());
    }

    public isDone() {
        return this.ajza.every(juz => juz.status === JUZ_STATUS.DONE);
    }

    public assignJuz(juzIndex, owner) {
        this.ajza[juzIndex].owner = owner;
    }

    public toJson() {

        let res = new KhitmaGroup_Sequential(this);

        // convert to native js object
        res.ajza = this.ajza.map((obj) => { return Object.assign({}, obj) });

        return res;
    }

    public getAjzaObj() {
        return { ...this.ajza.map((obj) => { return Object.assign({}, obj) }) };
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

        let ajza = KhitmaGroup_Sequential.getEmptyAjzaArray();

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



}

export class KhitmaGroup_SameTask extends KhitmaGroup {
    task: string;
    members: GroupMember[];
    totalDoneTasks: number;

    public constructor(init?: Partial<KhitmaGroup_SameTask>) {
        super(init);
        this.members = this._createMembersArray(this.members);//Object.values(init.members).sort((m1, m2) => (m1.name > m2.name ? 1 : -1));

    }

    private _createMembersArray(membersObj) {

        let arr = [];

        for (let [name, value] of Object.entries(membersObj)) {
            arr.push({
                name: name,
                isTaskDone: (<GroupMember>value).isTaskDone
            });
        }

        return arr.sort((m1, m2) => (m1.name > m2.name ? 1 : -1));
    }

    public getCounts() {

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
                // name: name,
                isTaskDone: isTaskDone
            }
        }), {});

    }
}

export class GroupMember {
    name: string
    isTaskDone: boolean;
    task: string; // default is group task

    public constructor(init?: Partial<GroupMember>) {
        Object.assign(this, init);
    }
}





export class KhitmaGroup_Pages extends KhitmaGroup {
    isStarted: boolean;
    task: string;
    members: GroupMember_Pages[];

    public constructor(init?: Partial<KhitmaGroup_Pages>) {
        super(init);
        this.members = this._createMembersArray(this.members);
    }

    private _createMembersArray(membersObj) {

        let arr = [];

        for (let [name, value] of Object.entries(membersObj)) {

            let memberData = <GroupMember_Pages>value;

            arr.push({
                name: name,
                isTaskDone: memberData.isTaskDone,
                pagesTask: memberData.pagesTask
            });
        }

        return arr.sort((m1, m2) => (m1.name > m2.name ? 1 : -1));
    }

    public getCounts() {

        return {
            total: this.members.length,
            done: this.members.filter(function (item) { return item.isTaskDone; }).length
        };

    }

    public createGroupMember(username) {

        let member = this.members.find(m => m.name === username);

        return new GroupMember_Pages({
            name: username,
            isTaskDone: member?.isTaskDone,
            pagesTask: member?.pagesTask,
        });
    }

    // public assignMemberPages(username, startPage, endPage) {

    //     let member = this.members.find(m => m.name === username);

    //     member.pagesTask = {
    //         start: startPage,
    //         end: endPage,
    //     }
    // }


    public getMembersObj() {

        return this.members.reduce((m, { name, isTaskDone, pagesTask }) => ({
            ...m, [name]: {
                // name: name,
                isTaskDone: isTaskDone,
                pagesTask: pagesTask,
            }
        }), {});

    }
}


export class GroupMember_Pages extends GroupMember {

    pagesTask;

    public constructor(init?: Partial<GroupMember_Pages>) {
        super(init);
    }

}

