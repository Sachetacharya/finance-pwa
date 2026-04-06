import {
  Component,
  input,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  viewChild,
  effect,
} from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<div class="chart-wrapper"><canvas #chartCanvas></canvas></div>`,
  styles: [`.chart-wrapper { position: relative; width: 100%; height: 100%; min-height: 200px; }`],
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  type = input.required<ChartType>();
  data = input.required<ChartConfiguration['data']>();
  options = input<ChartConfiguration['options']>({});

  readonly chartCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  private chartInstance: Chart | null = null;

  constructor() {
    // React to data changes after chart is created
    effect(() => {
      const data = this.data();
      if (this.chartInstance) {
        this.chartInstance.data = data;
        this.chartInstance.update('active');
      }
    });
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  private createChart(): void {
    const canvas = this.chartCanvas().nativeElement;
    this.chartInstance?.destroy();
    this.chartInstance = new Chart(canvas, {
      type: this.type(),
      data: this.data(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...this.options(),
      },
    });
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
    this.chartInstance = null;
  }
}
