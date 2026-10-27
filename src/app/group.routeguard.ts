import { Injectable } from "@angular/core";
import { ActivatedRoute, ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { AlertService } from "./alert.service";
import { KhitmaGroupService } from "./khitma-group.service";
import { LocalDatabaseService } from "./local-database.service";
import { CommonService } from "./service/common.service";

@Injectable()
export class GroupJoinedGuard  {
    constructor(
        private localDB: LocalDatabaseService, private router: Router, private groupsApi: KhitmaGroupService, private alert: AlertService, private common: CommonService) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

        const groupId = route.params.groupId;
        const target = this.localDB.isGroupJoined(groupId) ? 'dashboard' : 'join';

        // Compare the route segment itself: a group ID can contain "join" or "dashboard".
        const currentChild = state.url.split(/[?#]/)[0].split('/').filter(Boolean)[2];
        if (currentChild !== target) {
            // The redirected navigation runs this guard again and loads the group once there.
            return this.router.createUrlTree(['group', groupId, target]);
        }

        this.groupsApi.setCurrentGroup(groupId).subscribe((group) => {

            if (!this.groupsApi.isValidGroup(group)) {
                this.alert.show(this.common.translation.khitma?.notFound);
                this.router.navigate(['/']);
                return;
            }
        });

        return true;


    }
}