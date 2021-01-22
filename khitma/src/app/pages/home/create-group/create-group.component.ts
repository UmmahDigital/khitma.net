import { Component, OnInit } from '@angular/core';
import { KhitmaGroup } from '../../../entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { Router } from '@angular/router';
import { AlertService } from '../../../alert.service';


@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.component.html',
  styleUrls: ['./create-group.component.scss']
})
export class CreateGroupComponent implements OnInit {

  title: string;
  description: string;
  author: string;

  constructor(private groupsApi: KhitmaGroupService, private router: Router, private alert: AlertService) { }

  ngOnInit(): void {
  }

  createGroup() {

    this.groupsApi.createGroup(this.title, this.description, this.author,).then(docRef => {

      this.alert.show("تمّ إنشاء مجموعة الختمة بنجاح!");
      this.router.navigate(['/group/' + docRef.id + '/invite']);

    });
  }

}

