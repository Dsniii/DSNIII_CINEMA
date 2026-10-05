import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisorQr } from './qr-viewer';

describe('VisorQr', () => {
  let componente: VisorQr;
  let fixture: ComponentFixture<VisorQr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisorQr],
    }).compileComponents();

    fixture = TestBed.createComponent(VisorQr);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
