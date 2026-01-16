"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Tag,
  ArrowRight,
  ExternalLink,
  Database,
  Loader2,
  Brain,
  CheckCircle,
} from "lucide-react";

const BillSkeleton = ({ delay = 0 }) => (
  <div 
    className="glass-card p-6 border border-slate-200/50 animate-fade-in-up"
    style={{ animationDelay: `${delay * 0.1}s` }}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-6 bg-slate-200 rounded-lg mb-3 w-3/4 skeleton-shimmer"></div>
        
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-full skeleton-shimmer"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3 skeleton-shimmer"></div>
        </div>
        
        <div className="flex items-center space-x-2 mt-3">
          <div className="w-2 h-2 bg-slate-200 rounded-full skeleton-shimmer"></div>
          <div className="h-3 bg-slate-200 rounded w-20 skeleton-shimmer"></div>
        </div>
      </div>
      <div className="w-8 h-8 bg-slate-200 rounded-lg skeleton-shimmer"></div>
    </div>
  </div>
);

const BillsSkeletonList = ({ count = 10 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <BillSkeleton key={i} delay={i} />
    ))}
  </div>
);

export default function BillsListUI() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalBills, setTotalBills] = useState(0);
  const [processingBills, setProcessingBills] = useState(new Set());
  const [processedBills, setProcessedBills] = useState(new Set());
  
  const observer = useRef();
  const lastBillElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreBills();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  const fetchBills = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(`/api/bills?page=${page}&limit=10`);
      const data = await res.json();
      
      if (data.bills) {
        if (isLoadMore) {
          setBills(prev => [...prev, ...data.bills]);
        } else {
          setBills(data.bills);
        }
        
        setHasMore(data.pagination.hasMore);
        setTotalBills(data.pagination.total);
        setCurrentPage(data.pagination.page);
      }
    } catch (err) {
      console.error("Failed to fetch bills:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreBills = () => {
    if (!loadingMore && hasMore) {
      fetchBills(currentPage + 1, true);
    }
  };

  useEffect(() => {
    const filtered = bills.filter((bill) =>
      bill.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBills(filtered);
  }, [bills, searchTerm]);


  useEffect(() => {
    fetchBills(1, false);
  }, []);

  const processBill = async (bill) => {
    if (!bill.pdf || processingBills.has(bill.id) || processedBills.has(bill.id)) {
      return;
    }

    setProcessingBills(prev => new Set([...prev, bill.id]));

    try {
      console.log('Processing bill:', bill.id, bill.title);
      
      const response = await fetch('/api/process-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id.toString(),
          pdfUrl: bill.pdf,
          title: bill.title,
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API response:', result);
      
      if (result.success) {
        setProcessedBills(prev => new Set([...prev, bill.id]));
        // console.log(`Bill ${bill.id} processed successfully:`, result);
        alert(`Bill processed successfully! ${result.chunksStored} chunks stored.`);
      } else {
        // console.error('Failed to process bill:', result.error);
        alert(`Failed to process bill: ${result.error}`);
      }
    } catch (error) {
      // console.error('Error processing bill:', error);
      alert(`Error processing bill: ${error.message}`);
    } finally {
      setProcessingBills(prev => {
        const newSet = new Set(prev);
        newSet.delete(bill.id);
        return newSet;
      });
    }
  };

  const openPRSIndia = () => {
    window.open("https://prsindia.org/billtrack/", "_blank");
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-white/80 to-slate-50/60 backdrop-blur-sm flex flex-col">
      <div className="p-6 border-b border-slate-200/50 bg-gradient-to-r from-white/90 to-slate-50/80">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#B20F38] to-[#8A0C2D] rounded-xl flex items-center justify-center glow">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-slate-800 text-xl font-bold text-gradient">
                BillRAG
              </h2>
              <p className="text-slate-600 text-sm">
                Track and analyze parliamentary bills
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-slate-600 text-sm">
              <Database size={16} />
              <span>PRS India Data</span>
            </div>
            <button
              className="btn-secondary flex items-center space-x-2 px-3 py-2 text-sm"
              onClick={openPRSIndia}
            >
              <ExternalLink size={16} />
              <span>PRS India</span>
            </button>
          </div>
        </div>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search bills by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/80 border border-slate-300/50 rounded-xl pl-12 pr-4 py-3 text-slate-800 placeholder-slate-500 focus:outline-none focus:border-[#B20F38]/50 focus:ring-2 focus:ring-[#B20F38]/20 transition-all duration-300"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {loading ? (
              <div className="flex items-center space-x-3">
                <Loader2 size={16} className="animate-spin text-[#B20F38]" />
                <div className="h-4 bg-slate-200 rounded w-32 skeleton-shimmer"></div>
              </div>
            ) : (
              <span>
                Showing {filteredBills.length} of {totalBills} bills
                {searchTerm && ` (filtered by "${searchTerm}")`}
              </span>
            )}
          </div>
          
          {(loading || loadingMore) && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#B20F38] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#B20F38] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-[#B20F38] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-4 bg-slate-200 rounded animate-pulse"></div>
                <div className="w-20 h-4 bg-slate-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            <BillsSkeletonList count={10} />

            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <Loader2 size={24} className="animate-spin text-[#B20F38]" />
                <span className="text-slate-600 font-medium">Loading parliamentary bills...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBills.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 text-lg">
                  {searchTerm ? "No bills found matching your search" : "No bills available"}
                </p>
                {searchTerm && (
                  <p className="text-slate-500 text-sm mt-2">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            ) : (
              <>
                {filteredBills.map((bill, idx) => {
                  const isLastElement = idx === filteredBills.length - 1;
                  
                  const handleBillClick = async (e) => {
                    e.preventDefault();
                    
                    if (!processedBills.has(bill.id) && !processingBills.has(bill.id)) {
                      setProcessingBills(prev => new Set([...prev, bill.id]));
                      
                      try {
                        const response = await fetch('/api/process-bill', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            billId: bill.id,
                            pdfUrl: bill.pdf,
                            title: bill.title,
                          }),
                        });

                        if (response.ok) {
                          const result = await response.json();
                          setProcessedBills(prev => new Set([...prev, bill.id]));
                        }
                      } catch (error) {
                        console.error('Error processing bill:', error);
                      } finally {
                        setProcessingBills(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(bill.id);
                          return newSet;
                        });
                      }
                    }
                    const chatUrl = `/chat?pdf=${encodeURIComponent(bill.pdf)}&title=${encodeURIComponent(bill.title)}&id=${bill.id}`;
                    window.open(chatUrl, '_blank');
                  };
                  
                  return (
                    <div
                      key={`${bill.id}-${idx}`}
                      onClick={handleBillClick}
                      className="block animate-fade-in-up cursor-pointer"
                      style={{ animationDelay: `${(idx % 10) * 0.05}s` }}
                      ref={isLastElement ? lastBillElementRef : null}
                    >
                      <div className="glass-card p-6 hover-lift cursor-pointer group border border-slate-200/50 transition-all duration-300 relative">
                        {processingBills.has(bill.id) && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                            <div className="flex items-center space-x-3">
                              <Loader2 size={20} className="animate-spin text-[#B20F38]" />
                              <span className="text-[#B20F38] font-medium">Processing bill...</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-slate-800 font-bold text-lg mb-2 group-hover:text-[#B20F38] transition-colors">
                              {bill.title}
                            </h3>

                            <p className="text-slate-600 text-sm leading-relaxed break-all mb-3">
                              {bill.link}
                            </p>
                            <div className="flex items-center justify-between">
                              {bill.pdf ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-green-600 text-xs font-medium">PDF Available</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                  <span className="text-orange-600 text-xs font-medium">No PDF Found</span>
                                </div>
                              )}

                              {bill.pdf && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    processBill(bill);
                                  }}
                                  disabled={processingBills.has(bill.id) || processedBills.has(bill.id)}
                                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                    processedBills.has(bill.id)
                                      ? 'bg-green-100 text-green-700 cursor-default'
                                      : processingBills.has(bill.id)
                                      ? 'bg-blue-100 text-blue-700 cursor-wait'
                                      : 'bg-[#B20F38]/10 text-[#B20F38] hover:bg-[#B20F38]/20 cursor-pointer'
                                  }`}
                                >
                                  {processedBills.has(bill.id) ? (
                                    <>
                                      <CheckCircle size={12} />
                                      <span>Ready for Chat</span>
                                    </>
                                  ) : processingBills.has(bill.id) ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin" />
                                      <span>Processing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Brain size={12} />
                                      <span>Process Bill</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="w-8 h-8 bg-gradient-to-r from-[#B20F38]/20 to-[#8A0C2D]/20 rounded-lg flex items-center justify-center group-hover:from-[#B20F38]/30 group-hover:to-[#8A0C2D]/30 transition-all duration-200 ml-4">
                            <ArrowRight
                              size={16}
                              className="text-[#B20F38] group-hover:translate-x-1 transition-transform"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loadingMore && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center py-6">
                      <div className="flex items-center space-x-3">
                        <Loader2 size={24} className="animate-spin text-[#B20F38]" />
                        <span className="text-slate-600 font-medium">Loading more bills...</span>
                      </div>
                    </div>
                    <BillsSkeletonList count={5} />
                  </div>
                )}
                
                {!hasMore && bills.length > 0 && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 rounded-full">
                      <FileText size={16} className="text-slate-500" />
                      <span className="text-slate-600 text-sm font-medium">
                        You've reached the end of all bills
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
