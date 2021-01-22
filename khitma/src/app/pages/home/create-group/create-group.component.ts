import { Component, OnInit } from '@angular/core';
import { KhitmaGroup } from '../../../entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.component.html',
  styleUrls: ['./create-group.component.scss']
})
export class CreateGroupComponent implements OnInit {

  title: string;
  description: string;
  author: string;

  constructor(private groupsApi: KhitmaGroupService, private router: Router) { }

  ngOnInit(): void {
  }

  createGroup() {

    this.groupsApi.createGroup(this.title, this.description, this.author,).then(docRef => {

      this.router.navigate(['/product-details', docRef.id]);

      // this.router.navigateByUrl('/group/' +  + "/invite");

    });
  }

}

