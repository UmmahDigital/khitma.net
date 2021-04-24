import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { GroupMember_Pages } from 'src/app/entities/entities';



@Component({
  selector: 'app-khitma-pages-progress',
  templateUrl: './khitma-pages-progress.component.html',
  styleUrls: ['./khitma-pages-progress.component.scss']
})
export class KhitmaPagesProgressComponent implements OnInit {


  // @ViewChild('progressCanvas', { static: false }) progressCanvas: ElementRef;
  // public context: CanvasRenderingContext2D;

  @Input() members: GroupMember_Pages[];


  DIMENTION = 25;
  PIXEL_SIZE = 10;

  NUM_OF_QURAN_PAGES = 604;

  pagesStatusesMatrix: Boolean[][];

  from: number;
  to: number;


  constructor() {

  }

  ngOnInit(): void {
    this._initMatrix();

    this._initMembers();
  }


  _initMembers() {

    this.members?.forEach(member => {

      if (member.pages) {
        this.updatePages(member.pages.start, member.pages.end, member.isTaskDone);
      }

    });
  }

  _initMatrix() {
    this.pagesStatusesMatrix = [];

    for (let x = 0; x < this.DIMENTION; x++) {

      this.pagesStatusesMatrix.push([]);

      for (let y = 0; y < this.DIMENTION; y++) {

        this.pagesStatusesMatrix[x].push(false);
      }
    }

    for (let i = this.NUM_OF_QURAN_PAGES; i < this.DIMENTION * this.DIMENTION; i++) {
      let cords = this._getPageCoordination(i);
      this.pagesStatusesMatrix[cords.x][cords.y] = null;
    }

  }

  updatePages(startPage, endPage, isDone) {

    for (let i = Number(startPage); i <= Number(endPage); i++) {

      let cords = this._getPageCoordination(i);

      this.pagesStatusesMatrix[cords.x][cords.y] = isDone
    }

  }

  _getPageCoordination(page) {
    let res = { x: 0, y: 0 };
    res.x = Math.floor(page / this.DIMENTION);
    res.y = page % this.DIMENTION;
    return res;
  }



  // ngAfterViewInit(): void {
  //   this.context = this.progressCanvas.nativeElement.getContext('2d');

  //   this.context.canvas.width = this.DIMENTION * this.PIXEL_SIZE;
  //   this.context.canvas.height = this.DIMENTION * this.PIXEL_SIZE;

  //   // this.context.fillStyle = "rgba(" + 255 + "," + 255 + "," + 255 + "," + (150 / 255) + ")";
  //   this.context.fillStyle = "#ff0000";
  //   this.context.fillRect(0, 0, this.PIXEL_SIZE, this.PIXEL_SIZE);

  // }




}
