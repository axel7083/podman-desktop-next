/** Shared types of the appdev kit. */
export interface DataColumn<R> {
  title: string;
  width?: string;
  value: (row: R) => string;
}
