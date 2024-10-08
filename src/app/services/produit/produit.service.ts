import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Produit } from 'src/app/models/produit';
import { catchError, map } from 'rxjs/operators';
import { GlobalErrorHandler } from '../ErrorHandler/global-error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {

  private produits: Produit[] = [];
  private articlesDuPanier: Produit[] = [];
  private articlesDuPanierSubject = new BehaviorSubject<Produit[]>([]);



  constructor(private http: HttpClient, private globalErrorHandler: GlobalErrorHandler) { }

  //check if products are already stored, if not, fetch them from the json file
  get AllProduitsDuStock(): Observable<Produit[]> {
    if (this.produits.length > 0) {
      return of(this.produits);
    } else {
      return this.http.get<Produit[]>('assets/produits.json').pipe(
        map(produits => {
          this.produits = produits;
          return produits;
        }),
        catchError(error=> {
            this.globalErrorHandler.handleError(error);
            return of([]);
        })
      );
    }
  }

  get AllArticlesDuPanier(): Observable<Produit[]> {
    return this.articlesDuPanierSubject.asObservable();
  }

  addProduitAuPanier(produit: Produit, quantity: number): void {
    const isArticleExist = this.articlesDuPanier.find(article => article.id === produit.id);
    if (isArticleExist) {
      isArticleExist.quantity += quantity;
    } else {
      this.articlesDuPanier.push({ ...produit, quantity });
    }
    this.articlesDuPanierSubject.next(this.articlesDuPanier);
  }

  updateQuantiteApresDelete(IdDuProduit: number, quantity: number): void {
    const produit = this.produits.find(p => p.id === IdDuProduit);
    if (produit) {
      produit.quantity -= quantity;
    }
  }

  deleteProduitDuPanier(IdDuProduit: number, quantity: number): void {
    const article = this.articlesDuPanier.find(article => article.id === IdDuProduit);
    if (article) {
      article.quantity -= quantity;
      if (article.quantity <= 0) {
        this.articlesDuPanier = this.articlesDuPanier.filter(article => article.id !== IdDuProduit);
      }
      this.articlesDuPanierSubject.next(this.articlesDuPanier);

      this.updateQuantiteApresDelete(IdDuProduit, quantity);
    }
  }

  //change this function in case it is necessary to apply the 5% on first-time products requires  

  calculDeLaTaxeDuProduit(produit: Produit, prixDuProduitSansTaxe: number): number {
    let taxeAppliqueSurLeProduit: number = 0;
    if (produit.category !== 'Food' && produit.category !== 'Medecine') {
      taxeAppliqueSurLeProduit += produit.category === 'Books' ? 10 : 20;
    }
    if (produit.isImported) {
      taxeAppliqueSurLeProduit += 5;
    }

    const montantDeLaTaxeFinale = prixDuProduitSansTaxe * taxeAppliqueSurLeProduit / 100;
    return Math.round(montantDeLaTaxeFinale * 20) / 20; // arrondi à 2 décimal après la virgule
  }

  calculDuPrixTotalAvecLesTaxes(produit: Produit, prixDuProduitSansTaxe: number): number { //avoid using method with 3 arguments
    const taxeFinaleApresCalcul = this.calculDeLaTaxeDuProduit(produit, prixDuProduitSansTaxe);
    const prixTotalTTCApresCalcul = prixDuProduitSansTaxe + taxeFinaleApresCalcul;
    return Math.round(prixTotalTTCApresCalcul * 100) / 100; // arrondi à 2 décimal et à 0.05
  }
}