import { Directive, OnInit, OnDestroy } from '@angular/core';
import { lockBodyScroll, unlockBodyScroll } from '../utils/body-scroll.utils';

@Directive({ selector: '[lockScroll]', standalone: true })
export class LockScrollDirective implements OnInit, OnDestroy {
  ngOnInit(): void { lockBodyScroll(); }
  ngOnDestroy(): void { unlockBodyScroll(); }
}
