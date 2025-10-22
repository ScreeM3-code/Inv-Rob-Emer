import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    try {
      const localData = localStorage.getItem('cartItems');
      if (localData) {
        setCartItems(JSON.parse(localData));
      }
    } catch (error) {
      console.error("Erreur lors du chargement du panier depuis localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du panier dans localStorage", error);
    }
  }, [cartItems]);

  const addToCart = (piece) => {
    setCartItems(prevItems => {
      const isItemInCart = prevItems.find(item => item.RéfPièce === piece.RéfPièce);
      if (isItemInCart) {
        alert(`${piece.NomPièce} est déjà dans le panier`);
        return prevItems;
      }
      return [...prevItems, { 
        ...piece, 
        cartQty: 1,
        // S'assurer que les infos fournisseur sont présentes
        fournisseur_principal: piece.fournisseur_principal,
        RéfFournisseur: piece.RéfFournisseur
      }];
    });
  };

  const removeFromCart = (pieceId) => {
    setCartItems(prevItems => prevItems.filter(item => item.RéfPièce !== pieceId));
  };
  
  const clearCart = () => {
    setCartItems([]);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};