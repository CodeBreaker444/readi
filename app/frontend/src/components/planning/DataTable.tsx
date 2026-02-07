'use client';
import React, { useEffect, useRef } from 'react';

interface Column {
  title: string;
  data: string;
  render?: (data: any, type: any, row: any) => string;
}

interface DataTableProps {
  id: string;
  columns: Column[];
  data: any[];
  onRowSelect?: (selectedRows: any[]) => void;
  isDark?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({
  id,
  columns,
  data,
  onRowSelect,
  isDark = false
}) => {
  const tableRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load DataTables
    const loadDataTables = async () => {
      // Load jQuery
      if (!(window as any).$) {
        const jqueryScript = document.createElement('script');
        jqueryScript.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
        jqueryScript.async = true;
        document.body.appendChild(jqueryScript);

        await new Promise(resolve => {
          jqueryScript.onload = resolve;
        });
      }

      // Load DataTables CSS
      if (!document.getElementById('datatables-css')) {
        const css = document.createElement('link');
        css.id = 'datatables-css';
        css.rel = 'stylesheet';
        css.href = 'https://cdn.datatables.net/2.2.2/css/dataTables.dataTables.min.css';
        document.head.appendChild(css);

        const buttonsCss = document.createElement('link');
        buttonsCss.rel = 'stylesheet';
        buttonsCss.href = 'https://cdn.datatables.net/buttons/3.2.2/css/buttons.dataTables.css';
        document.head.appendChild(buttonsCss);
      }

      // Load DataTables JS
      if (!(window as any).$.fn.DataTable) {
        const dtScript = document.createElement('script');
        dtScript.src = 'https://cdn.datatables.net/2.2.2/js/dataTables.min.js';
        dtScript.async = true;
        document.body.appendChild(dtScript);

        await new Promise(resolve => {
          dtScript.onload = resolve;
        });
      }

      // Load Buttons extension
      if (!(window as any).$.fn.DataTable.Buttons) {
        const buttonsScript = document.createElement('script');
        buttonsScript.src = 'https://cdn.datatables.net/buttons/3.2.2/js/dataTables.buttons.js';
        buttonsScript.async = true;
        document.body.appendChild(buttonsScript);

        await new Promise(resolve => {
          buttonsScript.onload = resolve;
        });
      }

      initializeTable();
    };

    loadDataTables();

    return () => {
      if (tableRef.current) {
        tableRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (tableRef.current && data) {
      tableRef.current.clear();
      tableRef.current.rows.add(data);
      tableRef.current.draw();
    }
  }, [data]);

  const initializeTable = () => {
    const $ = (window as any).$;
    
    if (tableRef.current) {
      tableRef.current.destroy();
    }

    tableRef.current = $(`#${id}`).DataTable({
      data: data,
      columns: columns,
      select: onRowSelect ? {
        style: 'multi',
        selector: 'td:first-child'
      } : false,
      dom: 'Bfrtip',
      buttons: [
        'copy',
        'excel',
        'pdf',
        'print'
      ],
      pageLength: 10,
      responsive: true,
      language: {
        search: 'Search:',
        lengthMenu: 'Show _MENU_ entries',
        info: 'Showing _START_ to _END_ of _TOTAL_ entries',
        paginate: {
          first: 'First',
          last: 'Last',
          next: 'Next',
          previous: 'Previous'
        }
      }
    });

    if (onRowSelect) {
      tableRef.current.on('select deselect', () => {
        const selectedData = tableRef.current.rows({ selected: true }).data().toArray();
        onRowSelect(selectedData);
      });
    }
  };

  return (
    <div className="overflow-x-auto">
      <table 
        id={id} 
        className={`display w-full ${isDark ? 'dark-theme' : ''}`}
        style={{ width: '100%' }}
      />
    </div>
  );
};

export default DataTable;