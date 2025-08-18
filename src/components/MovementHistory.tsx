
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Trash2,
  Edit,
  Download,
  CalendarIcon,
  X,
  PlusCircle,
  Camera,
  Eye,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PhotoUploadDialog from "./PhotoUploadDialog";

type Movement = {
  id: string;
  date: Timestamp;
  origin: string;
  destination: string;
  status: string;
  container: string;
  driver: string;
  plate: string;
  photoUrl?: string;
};

const MovementCard = ({ movement, onEdit, onDelete, onAttachPhoto, onViewPhoto, onDownloadPhoto }: {
  movement: Movement,
  onEdit: (m: Movement) => void,
  onDelete: (id: string) => void,
  onAttachPhoto: (id: string) => void,
  onViewPhoto: (url: string) => void,
  onDownloadPhoto: (url: string, container: string) => void,
}) => (
  <Card>
    <CardContent className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-lg">{movement.container}</p>
          <p className="text-sm text-muted-foreground">{movement.driver} / {movement.plate}</p>
        </div>
        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{movement.status}</span>
      </div>
      <div className="flex items-center text-sm text-muted-foreground">
        <span>{movement.origin}</span>
        <ArrowRight className="h-4 w-4 mx-2" />
        <span>{movement.destination}</span>
      </div>
      <p className="text-xs text-muted-foreground pt-2">
        {format(movement.date.toDate(), "dd MMM yyyy, HH:mm", { locale: es })}
      </p>
    </CardContent>
    <div className="flex justify-end gap-1 p-2 border-t">
      {movement.photoUrl ? (
        <>
          <Button variant="ghost" size="icon" onClick={() => onViewPhoto(movement.photoUrl!)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDownloadPhoto(movement.photoUrl!, movement.container)}>
            <Download className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => onAttachPhoto(movement.id)}>
          <Camera className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={() => onEdit(movement)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(movement.id)} className="text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </Card>
);

export default function MovementHistory() {
  const { toast } = useToast();
  const router = useRouter();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<Movement[]>([]);
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Initialize dates inside useEffect to prevent hydration error
    const today = new Date();
    setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
    setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
  }, []);

  const fetchMovements = useCallback(() => {
    const q = query(collection(db, "movements"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const movementsData: Movement[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // isClient check is now more robust because it's set in useEffect
          const localPhoto = isClient ? localStorage.getItem(`photo_${doc.id}`) : null;
          return { 
            id: doc.id, 
            ...data,
            photoUrl: localPhoto || data.photoUrl,
          } as Movement;
        });
        setMovements(movementsData);
      },
      (error) => {
        console.error("Error fetching movements: ", error);
        toast({
          variant: "destructive",
          title: "Error de Conexión",
          description: "No se pudieron cargar los datos.",
        });
      }
    );
    return unsubscribe;
  }, [toast, isClient]);

  useEffect(() => {
    if (!isClient) return;
    const unsubscribe = fetchMovements();
    const handlePhotoSaved = (event: Event) => {
      fetchMovements(); // Refetch all to get the latest photo data
    };
    window.addEventListener('photoSaved', handlePhotoSaved);
    return () => {
      unsubscribe();
      window.removeEventListener('photoSaved', handlePhotoSaved);
    };
  }, [fetchMovements, isClient]);

  useEffect(() => {
    let filtered = movements;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((m) => m.date.toDate() >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((m) => m.date.toDate() <= end);
    }
    setFilteredMovements(filtered);
  }, [movements, startDate, endDate]);

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleEdit = (movement: Movement) => {
    const { id, date, photoUrl, ...dataToEdit } = movement;
    const params = new URLSearchParams({ id, data: JSON.stringify(dataToEdit) });
    router.push(`/movements/new?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este movimiento?")) {
      await deleteDoc(doc(db, "movements", id));
      if (isClient) localStorage.removeItem(`photo_${id}`);
      toast({ title: "Movimiento eliminado" });
    }
  };
  
  const handleAttachPhoto = (movementId: string) => {
    setSelectedMovementId(movementId);
    setIsPhotoDialogOpen(true);
  };
  
  const handleViewPhoto = (photoUrl: string) => { window.open(photoUrl, '_blank') };

  const handleDownloadPhoto = (photoUrl: string, containerId: string) => {
    try {
      const link = document.createElement('a');
      link.href = photoUrl;
      link.download = `foto_${containerId.replace(/\s/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading photo: ", error);
      toast({ variant: "destructive", title: "Error de descarga", description: "No se pudo descargar la foto." });
    }
  };

  const downloadCSV = useCallback(() => {
    const headers = ["chofer", "placa", "fecha", "tipo de movimiento", "contenedor"];
    const csvContent = [
      headers.join(','),
      ...filteredMovements.map(m => {
        const date = format(m.date.toDate(), 'yyyy-MM-dd');
        const movementType = `${m.origin} -> ${m.destination} (${m.status})`;
        return [m.driver, m.plate, date, `"${movementType}"`, m.container].join(',');
      })
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "movimientos_contenedores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredMovements]);

  if (!isClient) {
    return null; // Render nothing on the server to avoid hydration mismatch
  }

  return (
    <>
      <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                  <CardTitle>Historial</CardTitle>
                  <CardDescription>Visualiza, filtra y gestiona los movimientos.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Link href="/movements/new" passHref className="w-full">
                    <Button className="w-full">
                        <PlusCircle className="mr-2" />
                        Registrar
                    </Button>
                </Link>
                <Button onClick={downloadCSV} disabled={filteredMovements.length === 0} variant="outline" className="w-full">
                    <Download className="mr-2" />
                    Descargar CSV
                </Button>
              </div>
          </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex gap-2 w-full">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "d MMM", { locale: es }) : <span>Inicio</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "d MMM", { locale: es }) : <span>Fin</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2 w-full">
              {(startDate || endDate) && (
                  <Button variant="ghost" size="icon" onClick={handleClearFilters}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Limpiar filtros</span>
                  </Button>
              )}
            </div>
          </div>

          {/* Mobile View: Cards */}
          <div className="grid gap-4 md:hidden">
            {filteredMovements.length > 0 ? (
              filteredMovements.map((m) => (
                <MovementCard 
                  key={m.id}
                  movement={m}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAttachPhoto={handleAttachPhoto}
                  onViewPhoto={handleViewPhoto}
                  onDownloadPhoto={handleDownloadPhoto}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">
                No hay movimientos para los filtros seleccionados.
              </p>
            )}
          </div>
          
          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contenedor</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length > 0 ? (
                  filteredMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.container}</div>
                        <div className="text-sm text-muted-foreground">{m.driver} / {m.plate}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{m.origin}</span>
                            <span className="text-muted-foreground">&rarr;</span>
                            <span className="font-medium">{m.destination}</span>
                            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{m.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(m.date.toDate(), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                           {m.photoUrl ? (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleViewPhoto(m.photoUrl!)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDownloadPhoto(m.photoUrl!, m.container)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleAttachPhoto(m.id)}>
                              <Camera className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      No hay movimientos registrados para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {selectedMovementId && (
        <PhotoUploadDialog
          isOpen={isPhotoDialogOpen}
          onOpenChange={setIsPhotoDialogOpen}
          movementId={selectedMovementId}
        />
      )}
    </>
  );
}
