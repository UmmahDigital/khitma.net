import { Directive, ElementRef, Input } from '@angular/core';
import { CommonService } from '../service/common.service';

@Directive({
  selector: '[translate]'
})
export class TranslateDirective {

  @Input() translate = '';

  constructor(private elementRef: ElementRef, public common: CommonService) {
    this.waitUntilLoadingTranslation();
  }

  waitUntilLoadingTranslation() {
    if (!this.common.translation.loaded) {
      setTimeout(() => {
        this.waitUntilLoadingTranslation()
      }, 50);
    } else {
      this.replaceText();
    }
  }

  getNestedObject = (nestedObj, pathArr) => {
    return pathArr.reduce((obj, key) =>
      (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
  }


  replaceText() {
    setTimeout(() => {
      this.elementRef.nativeElement.innerHTML = this.translateKey();
    }, 50);

  }

  translateKey() {
    let value = this.translate;
    const word = this.getNestedObject(this.common.translation, value.split('.'));
    if (!word) {
      return value;// 'translation missing #' + value + '#';
    }
    return word;
  }



}
