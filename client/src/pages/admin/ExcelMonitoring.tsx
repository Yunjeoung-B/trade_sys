import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import { 
  FileSpreadsheet, 
  Play, 
  Square, 
  FolderOpen, 
  Eye,
  Trash2,
  RefreshCw
} from "lucide-react";


interface ExcelCellData {
  cellAddress: string;
  value: any;
  timestamp: string;
  sheetName: string;
  fileName: string;
}

interface ExcelUpdateMessage {
  type: string;
  fileName: string;
  data: ExcelCellData[];
  timestamp: string;
}

export default function ExcelMonitoring() {
  const [filePath, setFilePath] = useState("");
  const [watchedFiles, setWatchedFiles] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeData, setRealtimeData] = useState<Map<string, ExcelCellData[]>>(new Map());
  const [selectedCells, setSelectedCells] = useState({
    filePath: "",
    sheetName: "Sheet1",
    cellAddress: "A1",
    range: "A1:C10"
  });
  const [cellValue, setCellValue] = useState<any>(null);
  const [rangeData, setRangeData] = useState<any[][]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // WebSocket 연결 설정
    connectWebSocket();
    loadWatchedFiles();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/excel-ws`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log("Excel WebSocket connected");
        setIsConnected(true);
        toast({
          title: "WebSocket 연결됨",
          description: "실시간 엑셀 모니터링이 시작되었습니다.",
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "excel_update") {
            const updateMsg = message as ExcelUpdateMessage;
            setRealtimeData(prev => {
              const newData = new Map(prev);
              newData.set(updateMsg.fileName, updateMsg.data);
              return newData;
            });
            
            toast({
              title: "엑셀 파일 업데이트",
              description: `${updateMsg.fileName}에서 데이터가 변경되었습니다.`,
            });
          } else if (message.type === "watched_files") {
            setWatchedFiles(message.files || []);
          }
        } catch (error) {
          console.error("WebSocket message parsing error:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("Excel WebSocket disconnected");
        setIsConnected(false);
        
        // 재연결 시도
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error("Excel WebSocket error:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  };

  const loadWatchedFiles = async () => {
    try {
      const response = await fetch("/api/excel/watched-files");
      const data = await response.json();
      setWatchedFiles(data.files || []);
    } catch (error) {
      console.error("Failed to load watched files:", error);
    }
  };

  const startMonitoring = async () => {
    if (!filePath.trim()) {
      toast({
        title: "오류",
        description: "파일 경로를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/excel/start-monitoring", {
        method: "POST",
        body: JSON.stringify({ filePath: filePath.trim() }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "모니터링 시작",
          description: data.message,
        });
        setWatchedFiles(prev => [...prev, filePath.trim()]);
        setFilePath("");
      }
    } catch (error: any) {
      toast({
        title: "모니터링 시작 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const stopMonitoring = async (filePathToStop: string) => {
    try {
      const response = await fetch("/api/excel/stop-monitoring", {
        method: "POST",
        body: JSON.stringify({ filePath: filePathToStop }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "모니터링 중지",
          description: data.message,
        });
        setWatchedFiles(prev => prev.filter(path => path !== filePathToStop));
        setRealtimeData(prev => {
          const newData = new Map(prev);
          const fileName = filePathToStop.split("/").pop() || filePathToStop;
          newData.delete(fileName);
          return newData;
        });
      }
    } catch (error: any) {
      toast({
        title: "모니터링 중지 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getCellValue = async () => {
    if (!selectedCells.filePath || !selectedCells.cellAddress) {
      toast({
        title: "오류",
        description: "파일 경로와 셀 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/excel/get-cell-value", {
        method: "POST",
        body: JSON.stringify({
          filePath: selectedCells.filePath,
          sheetName: selectedCells.sheetName,
          cellAddress: selectedCells.cellAddress
        }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (data.success) {
        setCellValue(data.value);
        toast({
          title: "셀 값 조회 성공",
          description: `${data.cellAddress}: ${data.value}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "셀 값 조회 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getRangeData = async () => {
    if (!selectedCells.filePath || !selectedCells.range) {
      toast({
        title: "오류",
        description: "파일 경로와 범위를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/excel/get-range-data", {
        method: "POST",
        body: JSON.stringify({
          filePath: selectedCells.filePath,
          sheetName: selectedCells.sheetName,
          range: selectedCells.range
        }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (data.success) {
        setRangeData(data.data);
        toast({
          title: "범위 데이터 조회 성공",
          description: `${data.range}에서 ${data.data.length}행 조회됨`,
        });
      }
    } catch (error: any) {
      toast({
        title: "범위 데이터 조회 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Sidebar />
      
      <div className="lg:ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Excel Real-time Monitoring
            </h1>
            <p className="text-gray-600">엑셀 파일 실시간 모니터링 및 데이터 동기화</p>
          </div>

          {/* 연결 상태 */}
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg rounded-2xl mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                연결 상태
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? "연결됨" : "연결 끊김"}
                </Badge>
                <span className="text-sm text-gray-600">
                  WebSocket 실시간 연결 상태
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 파일 모니터링 시작 */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle>엑셀 파일 모니터링 시작</CardTitle>
                <CardDescription>
                  Bloomberg API가 연결된 엑셀 파일 경로를 입력하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="file-path">파일 경로</Label>
                  <Input
                    id="file-path"
                    placeholder="예: C:\Bloomberg\Market_Data.xlsx"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  onClick={startMonitoring}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl"
                >
                  <Play className="mr-2 h-4 w-4" />
                  모니터링 시작
                </Button>
              </CardContent>
            </Card>

            {/* 특정 셀 값 조회 */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle>특정 셀 값 조회</CardTitle>
                <CardDescription>
                  특정 셀의 실시간 값을 조회합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="cell-file-path">파일 경로</Label>
                    <Input
                      id="cell-file-path"
                      placeholder="파일 경로"
                      value={selectedCells.filePath}
                      onChange={(e) => setSelectedCells(prev => ({ ...prev, filePath: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sheet-name">시트명</Label>
                    <Input
                      id="sheet-name"
                      placeholder="Sheet1"
                      value={selectedCells.sheetName}
                      onChange={(e) => setSelectedCells(prev => ({ ...prev, sheetName: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cell-address">셀 주소</Label>
                  <Input
                    id="cell-address"
                    placeholder="A1"
                    value={selectedCells.cellAddress}
                    onChange={(e) => setSelectedCells(prev => ({ ...prev, cellAddress: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  onClick={getCellValue}
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  셀 값 조회
                </Button>
                {cellValue !== null && (
                  <div className="p-3 bg-gray-100 rounded-xl">
                    <span className="font-medium">값:</span> {cellValue}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 모니터링 중인 파일 목록 */}
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg rounded-2xl mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>모니터링 중인 파일</span>
                <Button
                  onClick={loadWatchedFiles}
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {watchedFiles.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  모니터링 중인 파일이 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {watchedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="font-medium text-sm">{file}</span>
                      <Button
                        onClick={() => stopMonitoring(file)}
                        variant="destructive"
                        size="sm"
                        className="rounded-xl"
                      >
                        <Square className="mr-2 h-4 w-4" />
                        중지
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 실시간 데이터 표시 */}
          {realtimeData.size > 0 && (
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle>실시간 엑셀 데이터</CardTitle>
                <CardDescription>
                  모니터링 중인 파일의 실시간 데이터 변경사항
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Array.from(realtimeData.entries()).map(([fileName, data]) => (
                  <div key={fileName} className="mb-6">
                    <h3 className="font-semibold mb-3">{fileName}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">시트</th>
                            <th className="text-left p-2">셀</th>
                            <th className="text-left p-2">값</th>
                            <th className="text-left p-2">업데이트 시간</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.slice(0, 10).map((cell, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">{cell.sheetName}</td>
                              <td className="p-2">{cell.cellAddress}</td>
                              <td className="p-2">{cell.value}</td>
                              <td className="p-2 text-sm text-gray-500">
                                {new Date(cell.timestamp).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}