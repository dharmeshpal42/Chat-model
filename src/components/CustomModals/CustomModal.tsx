import { Dialog, DialogContent, DialogTitle, DialogActions, Button } from "@mui/material";

interface IProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  buttonLoading?: boolean;
  loadingText?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}
const CustomModal = ({ open, onClose, title, children, onCancel, onConfirm, buttonLoading = false, loadingText, confirmButtonText = "Confirm", cancelButtonText = "Cancel" }: IProps) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle
        sx={{
          fontWeight: "bold",
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={!!buttonLoading}>
          {cancelButtonText}
        </Button>
        <Button onClick={onConfirm} variant="contained" disabled={!!buttonLoading}>
          {buttonLoading ? loadingText : confirmButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomModal;
