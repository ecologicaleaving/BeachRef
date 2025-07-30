"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ShadcnTest() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">shadcn/ui Integration Test</h1>
      
      {/* Button Test */}
      <Card>
        <CardHeader>
          <CardTitle>Button Component</CardTitle>
          <CardDescription>Testing different button variants with FIVB theme</CardDescription>
        </CardHeader>
        <CardContent className="space-x-2">
          <Button>Primary (FIVB Blue)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </CardContent>
      </Card>

      {/* Badge Test */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Component</CardTitle>
          <CardDescription>Testing badge variants</CardDescription>
        </CardHeader>
        <CardContent className="space-x-2">
          <Badge>Default Badge</Badge>
          <Badge variant="secondary">Secondary Badge</Badge>
          <Badge variant="outline">Outline Badge</Badge>
          <Badge variant="destructive">Destructive Badge</Badge>
        </CardContent>
      </Card>

      {/* Table Test */}
      <Card>
        <CardHeader>
          <CardTitle>Table Component</CardTitle>
          <CardDescription>Testing table component</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>FIVB Beach Volleyball World Tour</TableCell>
                <TableCell>Brazil</TableCell>
                <TableCell><Badge>Active</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>European Championships</TableCell>
                <TableCell>Netherlands</TableCell>
                <TableCell><Badge variant="secondary">Upcoming</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}