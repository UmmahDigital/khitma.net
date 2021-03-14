import { Injectable } from "@angular/core";
import { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { KhitmaGroupService } from "./khitma-group.service";
import { LocalDatabaseService } from "./local-database.service";

@Injectable()
export class GroupJoinedGuard implements CanActivate {
    constructor(
        private localDB: LocalDatabaseService, private router: Router, private groupsApi: KhitmaGroupService) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

        const groupId = route.params.groupId;
        const isJoind = this.localDB.isGroupJoined(groupId);





        this.groupsApi.setCurrentGroup(groupId).subscribe((group) => {

            // if (!this.groupsApi.isValidGroup(group)) {
            //     this.alert.show("لم يتم العثور على الختمة المطلوبة.");
            //     this.router.navigate(['/']);
            //     return;

            // }

            // const isJoind = this.localDB.isGroupJoined(groupId);
            // const redirecTo = isJoind ? 'dashboard' : 'join';

            // if (!this.router.url.includes(redirecTo)) {
            //     this.router.navigate(['group', groupId, redirecTo]);


            // }

        });



        if (isJoind) {

            if (!state.url.includes("dashboard")) {
                this.router.navigate(['group', groupId, 'dashboard']);
            }

            return true;
        }


        if (!state.url.includes("join")) {
            this.router.navigate(['group', groupId, 'join']);
        }

        return true;



    }
}