import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Factory, User, Mail, Edit, Trash2 } from "lucide-react";

export default function FabricantCard({ fabricant, onEdit, onDelete }) {
  const logoUrl = fabricant.Domaine ? `https://logo.clearbit.com/${fabricant.Domaine}` : '';
  const handleLogoError = (e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; };

  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {fabricant.Domaine ? (
             <>
              <img src={logoUrl} alt={fabricant.NomFabricant} className="w-8 h-8 rounded" onError={handleLogoError} />
              <Factory className="w-8 h-8 text-blue-600 hidden" />
            </>
          ) : (
            <Factory className="w-8 h-8 text-blue-600" />
          )}
          <span className="truncate">{fabricant.NomFabricant}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        {fabricant.NomContact && <div className="flex items-center gap-2 text-sm text-slate-600"><User className="w-4 h-4" /><span>{fabricant.NomContact} ({fabricant.TitreContact || 'N/A'})</span></div>}
        {fabricant.Email && <a href={`mailto:${fabricant.Email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Mail className="w-4 h-4" /><span>{fabricant.Email}</span></a>}
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-red-500" /></Button>
        <Button variant="outline" size="sm" onClick={onEdit}><Edit className="w-4 h-4 mr-2" />Modifier</Button>
      </CardFooter>
    </Card>
  );
}