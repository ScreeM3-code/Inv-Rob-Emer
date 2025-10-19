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
        return prevItems; // ou mettre à jour la quantité si nécessaire
      }
      return [...prevItems, { ...piece, cartQty: piece.Qtéàcommander || 1 }];
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