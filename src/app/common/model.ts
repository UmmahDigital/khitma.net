export interface User {
    id?: string;
    fullName: string;
    email: string;
    photoUrl?: string;
    provider?: string;
    created?: Date;
    groupIds: string[];
}